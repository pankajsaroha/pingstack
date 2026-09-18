import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { hasWorkspacePermission } from '@/lib/server/teams';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: teamId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ error: 'Teams feature is available on the Pro plan.', code: 'PRO_REQUIRED' }, { status: 403 });
    }

    // Verify team exists and belongs to this tenant
    const { data: team } = await db
      .from('teams')
      .select('id, name, color')
      .eq('id', teamId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Fetch team members with user details
    const { data: teamMembers, error } = await db
      .from('team_members')
      .select('user_id, created_at, users(id, name, email, role, workspace_role, permissions, created_at)')
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const members = (teamMembers || []).map((tm: any) => tm.users).filter(Boolean);
    return NextResponse.json({ team, members });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch team members' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const currentUserId = req.headers.get('x-user-id');
  if (!tenantId || !currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: teamId } = await params;

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

    const body = await req.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one member to add' }, { status: 400 });
    }

    // Verify all target users belong to this workspace (direct members or accepted invites)
    const { getWorkspaceMembersServer } = await import('@/lib/server/teams');
    const allWorkspaceMembers = await getWorkspaceMembersServer(tenantId);
    const validMemberIdsSet = new Set(allWorkspaceMembers.map(m => m.id));
    const validUserIds = userIds.filter((uid: string) => validMemberIdsSet.has(uid));

    if (validUserIds.length === 0) {
      return NextResponse.json({ error: 'No valid workspace members found to add' }, { status: 400 });
    }

    // Insert into team_members (upsert to handle existing gracefully without error)
    const rows = validUserIds.map((uid: string) => ({
      tenant_id: tenantId,
      team_id: teamId,
      user_id: uid
    }));

    for (const row of rows) {
      await db
        .from('team_members')
        .upsert(row, { onConflict: 'team_id,user_id' });
    }

    return NextResponse.json({
      success: true,
      addedCount: validUserIds.length,
      message: `Added ${validUserIds.length} ${validUserIds.length === 1 ? 'member' : 'members'} to ${team.name}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add members to team' }, { status: 500 });
  }
}
