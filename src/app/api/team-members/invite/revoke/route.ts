import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { hasWorkspacePermission } from '@/lib/server/teams';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({
        error: 'Team member management is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const canManageMembers = await hasWorkspacePermission(userId, tenantId, 'members_manage');
    if (!canManageMembers) {
      return NextResponse.json({
        error: 'Forbidden: You do not have permission to revoke workspace invitations.',
        code: 'PERMISSION_DENIED'
      }, { status: 403 });
    }

    const body = await req.json();
    const { invitationId, email } = body;

    if (!invitationId && !email) {
      return NextResponse.json({ error: 'invitationId or email is required' }, { status: 400 });
    }

    let query = db
      .from('workspace_invitations')
      .select('id, email, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    if (invitationId) {
      query = query.eq('id', invitationId);
    } else if (email) {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data: invitation, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !invitation) {
      return NextResponse.json({ error: 'Pending invitation not found or already processed.' }, { status: 404 });
    }

    // Set status to revoked to preserve audit history and invalidate the token
    const { error: revokeErr } = await db
      .from('workspace_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitation.id)
      .eq('tenant_id', tenantId);

    if (revokeErr) {
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Invitation for ${invitation.email} has been revoked.`
    });
  } catch (err: any) {
    console.error('[POST /api/team-members/invite/revoke] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
