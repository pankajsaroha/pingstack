import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { signToken, verifyToken } from '@/lib/jwt';
import { hashPassword, verifyPassword } from '@/lib/hash';

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { token, password, name } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    // 1. Resolve and validate invitation completely server-side
    const { data: invitation, error: invErr } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invErr || !invitation) {
      return NextResponse.json({ 
        error: 'This invitation is invalid, expired, or has already been accepted.' 
      }, { status: 404 });
    }

    const cleanEmail = invitation.email.toLowerCase().trim();
    const tenantId = invitation.tenant_id;
    const assignedRole = invitation.role === 'admin' ? 'admin' : 'member';
    const assignedPermissions = invitation.permissions || {};
    const teamIds: string[] = Array.isArray(invitation.team_ids) ? invitation.team_ids : [];

    // 2. Check if user is already authenticated via cookie or header
    let authenticatedEmail: string | null = null;
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.headers.get('cookie')?.split('; ')?.find(row => row.startsWith('token='))?.split('=')[1];
    const rawJwt = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (rawJwt) {
      const payload = await verifyToken(rawJwt);
      if (payload?.email) {
        authenticatedEmail = payload.email.toLowerCase().trim();
      }
    }

    // 3. Check for existing user records with this email
    const { data: existingUser } = await db
      .from('users')
      .select('id, name, email, password_hash, role, tenant_id')
      .eq('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    let targetUserId: string;
    let finalRole = 'user';

    if (existingUser) {
      // If user is logged in with a different email, block acceptance
      if (authenticatedEmail && authenticatedEmail !== cleanEmail) {
        return NextResponse.json({ 
          error: `You are currently logged in as ${authenticatedEmail}, but this invitation was sent to ${cleanEmail}. Please log out and sign in with ${cleanEmail} to accept.`,
          code: 'EMAIL_MISMATCH'
        }, { status: 403 });
      }

      // Existing user: Verify session or verify password
      if (authenticatedEmail && authenticatedEmail === cleanEmail) {
        // Authenticated session matches invited email — seamless acceptance
      } else if (password) {
        // User supplied password
        const isPasswordValid = await verifyPassword(password, existingUser.password_hash);
        if (!isPasswordValid) {
          return NextResponse.json({ error: 'Incorrect password for this account.' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ 
          error: 'Please log in or enter your password to accept this workspace invitation.',
          code: 'PASSWORD_REQUIRED'
        }, { status: 401 });
      }

      finalRole = existingUser.role || 'user';
      targetUserId = existingUser.id;

      // If this is the user's primary registered workspace, update role/permissions in users table
      if (existingUser.tenant_id === tenantId) {
        await db
          .from('users')
          .update({
            workspace_role: assignedRole,
            permissions: assignedPermissions
          })
          .eq('id', targetUserId);
      }
      // For a secondary/new workspace: existingUser is REUSED cleanly without inserting duplicate user row!
    } else {
      // Brand new user: Name and password required
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Please provide your name.' }, { status: 400 });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);

      const { data: createdUser, error: createErr } = await db
        .from('users')
        .insert({
          tenant_id: tenantId,
          name: name.trim(),
          email: cleanEmail,
          password_hash: passwordHash,
          role: 'user',
          workspace_role: assignedRole,
          permissions: assignedPermissions
        })
        .select('id')
        .single();

      if (createErr || !createdUser) {
        return NextResponse.json({ error: createErr?.message || 'Failed to create account' }, { status: 500 });
      }
      targetUserId = createdUser.id;
    }

    // 4. Create team memberships in this workspace
    if (teamIds.length > 0) {
      for (const tid of teamIds) {
        await db
          .from('team_members')
          .upsert({ tenant_id: tenantId, team_id: tid, user_id: targetUserId }, { onConflict: 'team_id,user_id' });
      }
    }

    // 5. Mark invitation as accepted with role & permissions recorded
    await db
      .from('workspace_invitations')
      .update({ 
        status: 'accepted',
        role: assignedRole,
        permissions: assignedPermissions,
        team_ids: teamIds
      })
      .eq('id', invitation.id);

    // 6. Generate JWT session for the accepted workspace
    const jwtToken = await signToken({
      userId: targetUserId,
      email: cleanEmail,
      tenantId: tenantId,
      role: finalRole
    });

    const response = NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully!',
      redirect: '/dashboard'
    });

    // Set auth cookie
    response.cookies.set('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('[POST /api/team-members/invite/accept] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
