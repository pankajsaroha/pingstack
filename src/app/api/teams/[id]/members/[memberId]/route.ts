import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { hasWorkspacePermission } from '@/lib/server/teams';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const currentUserId = req.headers.get('x-user-id');
  if (!tenantId || !currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: teamId, memberId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ error: 'Teams feature is available on the Pro plan.', code: 'PRO_REQUIRED' }, { status: 403 });
    }

    const canManageTeams = await hasWorkspacePermission(currentUserId, tenantId, 'teams_manage');
    if (!canManageTeams) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage team members.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    // Verify team belongs to tenant
    const { data: team } = await db
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this workspace' }, { status: 404 });
    }

    // Delete membership from this team only
    const { error: deleteErr } = await db
      .from('team_members')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Member removed from ${team.name}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove member from team' }, { status: 500 });
  }
}
