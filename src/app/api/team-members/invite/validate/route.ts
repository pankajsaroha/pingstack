import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';

export async function GET(req: Request) {
  if (!db) return NextResponse.json({ valid: false, error: 'Database client unavailable' }, { status: 500 });

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ valid: false, error: 'Invalid or missing invitation token.' }, { status: 400 });
  }

  try {
    const { data: invitation, error } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ 
        valid: false, 
        error: 'This invitation is invalid, expired, or has already been used.' 
      }, { status: 404 });
    }

    // Fetch tenant name
    const { data: tenant } = await db
      .from('tenants')
      .select('id, name')
      .eq('id', invitation.tenant_id)
      .maybeSingle();

    // Fetch team names if any assigned
    let assignedTeams: { id: string; name: string; color?: string }[] = [];
    if (Array.isArray(invitation.team_ids) && invitation.team_ids.length > 0) {
      const { data: teamsData } = await db
        .from('teams')
        .select('id, name, color')
        .in('id', invitation.team_ids)
        .eq('tenant_id', invitation.tenant_id);
      assignedTeams = teamsData || [];
    }

    // Check if user already has an existing PingStack account
    const cleanEmail = invitation.email.toLowerCase().trim();
    const { data: existingUser } = await db
      .from('users')
      .select('id, name, email')
      .eq('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    // Check if incoming request is already authenticated
    let sessionEmail: string | null = null;
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.headers.get('cookie')?.split('; ')?.find(row => row.startsWith('token='))?.split('=')[1];
    const rawJwt = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

    if (rawJwt) {
      try {
        const { verifyToken } = await import('@/lib/jwt');
        const payload = await verifyToken(rawJwt);
        if (payload?.email) {
          sessionEmail = String(payload.email).toLowerCase().trim();
        } else if (payload?.userId) {
          const { data: sessionUser } = await db
            .from('users')
            .select('email')
            .eq('id', payload.userId)
            .maybeSingle();
          if (sessionUser?.email) {
            sessionEmail = String(sessionUser.email).toLowerCase().trim();
          }
        }
      } catch {
        // Token invalid/expired - treat as unauthenticated
      }
    }

    const isAuthenticated = Boolean(sessionEmail);
    const isMatchingUser = Boolean(sessionEmail && sessionEmail === cleanEmail);

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        workspaceId: invitation.tenant_id,
        workspaceName: tenant?.name || 'PingStack Workspace',
        teams: assignedTeams,
        expiresAt: invitation.expires_at,
        isExistingUser: Boolean(existingUser),
        existingUserName: existingUser?.name || null,
        isAuthenticated,
        currentUserEmail: sessionEmail,
        isMatchingUser
      }
    });
  } catch (err: any) {
    console.error('[GET /api/team-members/invite/validate] Error:', err);
    return NextResponse.json({ valid: false, error: 'Failed to validate invitation.' }, { status: 500 });
  }
}
