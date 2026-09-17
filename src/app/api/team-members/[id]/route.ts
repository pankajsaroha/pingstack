import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';
import { hasWorkspacePermission, DEFAULT_TEAM_MEMBER_PERMISSIONS, ADMIN_PERMISSIONS } from '@/lib/server/teams';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const currentUserId = req.headers.get('x-user-id');
  if (!tenantId || !currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: memberUserId } = await params;

  try {
    const teamsAllowed = await isFeatureAllowed(tenantId, 'teams');
    if (!teamsAllowed) {
      return NextResponse.json({ error: 'Teams feature is available on the Pro plan.', code: 'PRO_REQUIRED' }, { status: 403 });
    }

    const canManageMembers = await hasWorkspacePermission(currentUserId, tenantId, 'members_manage');
    if (!canManageMembers) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage members.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    const body = await req.json();
    const { teamIds, workspace_role, permissions } = body;

    // Verify target user belongs to this tenant
    const { data: user } = await db
      .from('users')
      .select('id, tenant_id, role, workspace_role')
      .eq('id', memberUserId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    // Update team memberships if provided
    if (Array.isArray(teamIds)) {
      // Clear existing team memberships
      await db
        .from('team_members')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', memberUserId);

      // Insert new team memberships
      if (teamIds.length > 0) {
        const inserts = teamIds.map((tid: string) => ({
          tenant_id: tenantId,
          team_id: tid,
          user_id: memberUserId
        }));
        await db.from('team_members').insert(inserts);
      }
    }

    // Update workspace role and permissions if provided
    const userUpdates: Record<string, any> = {};
    if (workspace_role === 'admin' || workspace_role === 'member') {
      const isCurrentlyAdmin = user.workspace_role === 'admin' || user.role === 'admin' || user.role === 'superadmin';
      
      // Last admin protection: cannot demote the only admin
      if (isCurrentlyAdmin && workspace_role === 'member') {
        const { data: allUsers } = await db
          .from('users')
          .select('id, role, workspace_role')
          .eq('tenant_id', tenantId);
        
        const adminCount = (allUsers || []).filter((u: any) => u.workspace_role === 'admin' || u.role === 'admin' || u.role === 'superadmin').length;
        if (adminCount <= 1) {
          return NextResponse.json({ 
            error: 'Cannot demote the only Workspace Admin. Promote another team member to Workspace Admin first.',
            code: 'LAST_ADMIN_PROTECTION'
          }, { status: 400 });
        }
      }

      userUpdates.workspace_role = workspace_role;
      if (workspace_role === 'admin') {
        userUpdates.permissions = ADMIN_PERMISSIONS;
      } else if (permissions && typeof permissions === 'object') {
        userUpdates.permissions = { ...DEFAULT_TEAM_MEMBER_PERMISSIONS, ...permissions };
      }
    } else if (permissions && typeof permissions === 'object') {
      userUpdates.permissions = { ...DEFAULT_TEAM_MEMBER_PERMISSIONS, ...permissions };
    }

    if (Object.keys(userUpdates).length > 0) {
      await db
        .from('users')
        .update(userUpdates)
        .eq('id', memberUserId)
        .eq('tenant_id', tenantId);
    }

    return NextResponse.json({ success: true, message: 'Member updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  const currentUserId = req.headers.get('x-user-id');
  if (!tenantId || !currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 });

  const { id: memberUserId } = await params;

  try {
    const canManageMembers = await hasWorkspacePermission(currentUserId, tenantId, 'members_manage');
    if (!canManageMembers) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to remove members.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }

    // 1. Prevent self-removal / self-deletion
    if (memberUserId === currentUserId) {
      return NextResponse.json({ error: 'Cannot remove yourself from the workspace. Another workspace admin must manage your membership.', code: 'SELF_REMOVAL_FORBIDDEN' }, { status: 400 });
    }

    // 2. Fetch target user to check admin status
    const { data: targetUser } = await db
      .from('users')
      .select('id, role, workspace_role')
      .eq('id', memberUserId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    // 3. Last Admin Protection: cannot remove the only admin in workspace
    const isTargetAdmin = targetUser.workspace_role === 'admin' || targetUser.role === 'admin' || targetUser.role === 'superadmin';
    if (isTargetAdmin) {
      const { data: allUsers } = await db
        .from('users')
        .select('id, role, workspace_role')
        .eq('tenant_id', tenantId);

      const adminCount = (allUsers || []).filter((u: any) => u.workspace_role === 'admin' || u.role === 'admin' || u.role === 'superadmin').length;
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last Workspace Admin. Promote another team member to Workspace Admin first to protect workspace access.',
          code: 'LAST_ADMIN_PROTECTION'
        }, { status: 400 });
      }
    }

    // 4. Remove team memberships
    await db
      .from('team_members')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', memberUserId);

    // 5. Safely unassign any conversations currently assigned to this user (preserving messages and history)
    await db
      .from('conversation_assignments')
      .update({ assigned_user_id: null, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('assigned_user_id', memberUserId);

    // 6. Remove member record from this workspace
    await db
      .from('users')
      .delete()
      .eq('id', memberUserId)
      .eq('tenant_id', tenantId);

    return NextResponse.json({ success: true, message: 'Member removed from workspace' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove member' }, { status: 500 });
  }
}
