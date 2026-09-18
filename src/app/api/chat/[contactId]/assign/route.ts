import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { assignConversationServer } from '@/lib/server/teams';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { contactId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ 
        error: 'Conversation assignment is available on the Pro plan.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const { hasWorkspacePermission, getUserTeamIdsServer, getEffectiveWorkspaceRole } = await import('@/lib/server/teams');
    const canAssign = await hasWorkspacePermission(userId, tenantId, 'inbox_assign');
    if (!canAssign) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have permission to assign or reassign conversations.',
        code: 'PERMISSION_DENIED'
      }, { status: 403 });
    }

    const effectiveRole = await getEffectiveWorkspaceRole(userId, tenantId);
    const isWorkspaceAdmin = effectiveRole === 'admin';
    const userTeamIds = await getUserTeamIdsServer(userId, tenantId);

    // Verify contact belongs to tenant
    const { data: contact } = await db
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check if the caller is authorized to access the current conversation
    if (!isWorkspaceAdmin) {
      const { data: currentAssignment } = await db
        .from('conversation_assignments')
        .select('team_id, assigned_user_id')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (currentAssignment) {
        const isAssignedToCaller = currentAssignment.assigned_user_id === userId;
        const isInAssignedTeam = currentAssignment.team_id && userTeamIds.includes(currentAssignment.team_id);
        const isUnassigned = !currentAssignment.team_id && !currentAssignment.assigned_user_id;

        if (!isAssignedToCaller && !isInAssignedTeam && !isUnassigned) {
          return NextResponse.json({
            error: 'Forbidden: You are not authorized to access or reassign this conversation.',
            code: 'PERMISSION_DENIED'
          }, { status: 403 });
        }
      }
    }

    const body = await req.json();
    const { teamId, assignedUserId, status = 'open' } = body;

    // Validate teamId if provided
    if (teamId) {
      const { data: team } = await db
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!team) {
        return NextResponse.json({ error: 'Specified team not found' }, { status: 400 });
      }

      // If user is not Workspace Admin and does not have teams_manage permission, they can only assign to their own teams
      if (!isWorkspaceAdmin) {
        const canManageTeams = await hasWorkspacePermission(userId, tenantId, 'teams_manage');
        if (!canManageTeams && !userTeamIds.includes(teamId)) {
          return NextResponse.json({
            error: 'Forbidden: You cannot assign conversations to a team you are not a member of.',
            code: 'PERMISSION_DENIED'
          }, { status: 403 });
        }
      }
    }

    // Validate assignedUserId if provided
    if (assignedUserId) {
      const { getWorkspaceMembersServer } = await import('@/lib/server/teams');
      const allMembers = await getWorkspaceMembersServer(tenantId);
      const isMember = allMembers.some(m => m.id === assignedUserId);

      if (!isMember) {
        return NextResponse.json({ error: 'Specified agent/user not found in this workspace' }, { status: 400 });
      }
    }

    const result = await assignConversationServer({
      tenantId,
      contactId,
      teamId: teamId !== undefined ? teamId : null,
      assignedUserId: assignedUserId !== undefined ? assignedUserId : null,
      status
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to assign conversation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assignment: result.assignment
    });
  } catch (err: any) {
    console.error('[POST /api/chat/[contactId]/assign] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
