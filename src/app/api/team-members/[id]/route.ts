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

    // Verify target user exists
    const { data: user } = await db
      .from('users')
      .select('id, name, email, tenant_id, role, workspace_role, permissions')
      .eq('id', memberUserId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // Check if user belongs to this tenant directly or via accepted invite
    const isDirectMember = user.tenant_id === tenantId;
    const { data: acceptedInvite } = await db
      .from('workspace_invitations')
      .select('id, role, permissions')
      .eq('tenant_id', tenantId)
      .eq('email', cleanEmail)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!isDirectMember && !acceptedInvite) {
      return NextResponse.json({ error: 'Member not found in this workspace' }, { status: 404 });
    }

    // Update team memberships if provided
    if (Array.isArray(teamIds)) {
      // Clear existing team memberships in this workspace
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
    const targetWorkspaceRole = workspace_role || (isDirectMember ? user.workspace_role : acceptedInvite?.role) || 'member';
    const isCurrentlyAdmin = targetWorkspaceRole === 'admin';

    if (workspace_role === 'member' && isCurrentlyAdmin) {
      // Last admin protection
      const members = await (await import('@/lib/server/teams')).getWorkspaceMembersServer(tenantId);
      const adminCount = members.filter(m => m.workspace_role === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot demote the only Workspace Admin. Promote another team member to Workspace Admin first.',
          code: 'LAST_ADMIN_PROTECTION'
        }, { status: 400 });
      }
    }

    const effectiveRole = workspace_role === 'admin' ? 'admin' : (workspace_role === 'member' ? 'member' : targetWorkspaceRole);
    const effectivePermissions = effectiveRole === 'admin'
      ? ADMIN_PERMISSIONS
      : (permissions && typeof permissions === 'object' ? { ...DEFAULT_TEAM_MEMBER_PERMISSIONS, ...permissions } : DEFAULT_TEAM_MEMBER_PERMISSIONS);

    if (isDirectMember) {
      await db
        .from('users')
        .update({
          workspace_role: effectiveRole,
          permissions: effectivePermissions
        })
        .eq('id', memberUserId)
        .eq('tenant_id', tenantId);
    }

    if (acceptedInvite) {
      await db
        .from('workspace_invitations')
        .update({
          role: effectiveRole,
          permissions: effectivePermissions,
          team_ids: Array.isArray(teamIds) ? teamIds : []
        })
        .eq('id', acceptedInvite.id);
    }

    const { invalidateTenantCache } = await import('@/lib/rate-limit');
    await invalidateTenantCache(tenantId, memberUserId);

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

    // 2. Fetch target user
    const { data: targetUser } = await db
      .from('users')
      .select('id, name, email, role, workspace_role, tenant_id')
      .eq('id', memberUserId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const cleanEmail = targetUser.email.toLowerCase().trim();
    const isDirectMember = targetUser.tenant_id === tenantId;

    // 3. Last Admin Protection
    const { getWorkspaceMembersServer } = await import('@/lib/server/teams');
    const allMembers = await getWorkspaceMembersServer(tenantId);
    const targetMember = allMembers.find(m => m.id === memberUserId);

    if (targetMember && targetMember.workspace_role === 'admin') {
      const adminCount = allMembers.filter(m => m.workspace_role === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last Workspace Admin. Promote another team member to Workspace Admin first to protect workspace access.',
          code: 'LAST_ADMIN_PROTECTION'
        }, { status: 400 });
      }
    }

    // 4. Remove team memberships in this workspace
    await db
      .from('team_members')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', memberUserId);

    // 5. Safely unassign any conversations in this workspace assigned to this user
    await db
      .from('conversation_assignments')
      .update({ assigned_user_id: null, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('assigned_user_id', memberUserId);

    // 6. If user joined via invitation, revoke/delete invitation record for this workspace
    await db
      .from('workspace_invitations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('email', cleanEmail);

    // 7. Revoke direct membership without deleting the global user account
    if (isDirectMember) {
      // Check if user belongs to other workspaces via accepted invitations
      const { data: otherInvite } = await db
        .from('workspace_invitations')
        .select('id, tenant_id, role, permissions')
        .eq('email', cleanEmail)
        .eq('status', 'accepted')
        .neq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otherInvite) {
        // Migrate primary workspace pointer to their other active workspace
        await db
          .from('users')
          .update({
            tenant_id: otherInvite.tenant_id,
            workspace_role: otherInvite.role || 'member',
            permissions: otherInvite.permissions || {}
          })
          .eq('id', memberUserId);

        // Remove the redundant invitation record for that other workspace
        await db
          .from('workspace_invitations')
          .delete()
          .eq('id', otherInvite.id);
      } else {
        // Dissociate from this workspace while strictly preserving the global user record and credentials
        await db
          .from('users')
          .update({
            workspace_role: 'removed',
            permissions: {}
          })
          .eq('id', memberUserId);
      }
    }

    // 8. Invalidate member-specific and tenant cache
    const { invalidateTenantCache } = await import('@/lib/rate-limit');
    await invalidateTenantCache(tenantId, memberUserId);

    return NextResponse.json({ success: true, message: 'Member removed from workspace' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove member' }, { status: 500 });
  }
}
