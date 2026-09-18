import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId || !db) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: invitationId } = await params;

  try {
    // 1. Resolve authenticated user
    const { data: user, error: userErr } = await db
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .maybeSingle();

    if (userErr || !user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // 2. Fetch invitation
    const { data: invitation, error: invErr } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // 3. Security: Email matching validation
    if (invitation.email.toLowerCase().trim() !== cleanEmail) {
      return NextResponse.json(
        { error: 'This invitation does not belong to your account.', code: 'EMAIL_MISMATCH' },
        { status: 403 }
      );
    }

    // 4. Validate invitation status & expiration
    if (invitation.status === 'revoked' || invitation.status === 'declined') {
      return NextResponse.json({ error: 'This invitation has been revoked.' }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    const tenantId = invitation.tenant_id;

    // 5. Assign team memberships if teams were specified
    if (Array.isArray(invitation.team_ids) && invitation.team_ids.length > 0) {
      const teamMemberRows = invitation.team_ids.map((teamId: string) => ({
        tenant_id: tenantId,
        team_id: teamId,
        user_id: user.id
      }));

      await db
        .from('team_members')
        .upsert(teamMemberRows, { onConflict: 'team_id,user_id', ignoreDuplicates: true });
    }

    // 6. Mark invitation as accepted
    await db
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    // 7. Issue new JWT token scoped to the newly joined workspace
    const token = await signToken({
      userId: user.id,
      tenantId: tenantId,
      role: user.role || 'user'
    });

    await invalidateTenantCache(tenantId);

    const isSecure = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      workspaceId: tenantId,
      token
    });

    response.cookies.set('token', token, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    console.error('[POST /api/user/invitations/[id]/accept] error:', err);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
