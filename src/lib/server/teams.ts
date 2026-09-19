import { dbAdmin as db } from '@/lib/db';
import { Team, TeamMember, WorkspaceMember, WorkspaceInvitation, ConversationAssignment, WorkspacePermissions } from '@/types';
import crypto from 'crypto';

export const DEFAULT_TEAM_MEMBER_PERMISSIONS: WorkspacePermissions = {
  inbox_view: true,
  inbox_reply: true,
  inbox_assign: false,
  contacts_view: true,
  contacts_manage: false,
  templates_view: true,
  templates_manage: false,
  campaigns_view: false,
  campaigns_create: false,
  campaigns_send: false,
  teams_manage: false,
  members_manage: false,
  settings_manage: false,
};

export const ADMIN_PERMISSIONS: WorkspacePermissions = {
  inbox_view: true,
  inbox_reply: true,
  inbox_assign: true,
  contacts_view: true,
  contacts_manage: true,
  templates_view: true,
  templates_manage: true,
  campaigns_view: true,
  campaigns_create: true,
  campaigns_send: true,
  teams_manage: true,
  members_manage: true,
  settings_manage: true,
};

import { cache } from 'react';

export interface UserWorkspaceAuth {
  isAuthorized: boolean;
  role: 'admin' | 'member';
  isWorkspaceAdmin: boolean;
  permissions: WorkspacePermissions;
  userTeamIds: string[];
}

async function fetchTeamIdsDirect(userId: string, tenantId: string): Promise<string[]> {
  if (!db) return [];
  try {
    const { data, error } = await db
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (!error && data && data.length > 0) {
      return data.map((tm: any) => tm.team_id);
    }

    // Fallback: join with teams table to ensure finding team memberships even if tenant_id was missing on team_members row
    const { data: fallback } = await db
      .from('team_members')
      .select('team_id, teams!inner(tenant_id)')
      .eq('user_id', userId)
      .eq('teams.tenant_id', tenantId);

    if (fallback && fallback.length > 0) {
      return fallback.map((tm: any) => tm.team_id);
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Unified request-scoped workspace authorization resolver.
 * Deduplicates user, role, permissions, and team ID lookups across a single request lifecycle.
 */
export const getUserWorkspaceAuthServer = cache(async (
  userId: string,
  tenantId: string
): Promise<UserWorkspaceAuth> => {
  const unauthorized: UserWorkspaceAuth = {
    isAuthorized: false,
    role: 'member',
    isWorkspaceAdmin: false,
    permissions: { ...DEFAULT_TEAM_MEMBER_PERMISSIONS, inbox_view: false, inbox_reply: false, contacts_view: false, templates_view: false },
    userTeamIds: [],
  };

  if (!db || !userId || !tenantId) return unauthorized;

  try {
    const { data: user, error } = await db
      .from('users')
      .select('id, email, tenant_id, workspace_role, role, permissions')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) return unauthorized;

    const isPlatformAdmin = user.role === 'admin' || user.role === 'superadmin';
    const cleanEmail = (user.email || '').toLowerCase().trim();

    // 1. If this is the user's primary/registered workspace:
    if (user.tenant_id === tenantId) {
      if (user.workspace_role === 'removed' || user.workspace_role === 'inactive' || user.workspace_role === 'none') {
        if (!isPlatformAdmin) return unauthorized;
      }

      const isWorkspaceAdmin = isPlatformAdmin || user.workspace_role === 'admin';
      const role: 'admin' | 'member' = isWorkspaceAdmin ? 'admin' : 'member';
      const rawPerms = user.permissions;
      const basePerms = isWorkspaceAdmin ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS;
      const permissions: WorkspacePermissions = rawPerms && typeof rawPerms === 'object'
        ? { ...basePerms, ...rawPerms }
        : basePerms;

      let userTeamIds: string[] = [];
      if (!isWorkspaceAdmin) {
        userTeamIds = await fetchTeamIdsDirect(userId, tenantId);
      }

      return {
        isAuthorized: true,
        role,
        isWorkspaceAdmin,
        permissions,
        userTeamIds,
      };
    }

    // 2. If user joined this workspace via invitation (multi-workspace membership):
    let acceptedInvite: any = null;
    if (cleanEmail) {
      const { data: inv } = await db
        .from('workspace_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('email', cleanEmail)
        .eq('status', 'accepted')
        .maybeSingle();
      acceptedInvite = inv;
    }

    if (acceptedInvite) {
      const isWorkspaceAdmin = isPlatformAdmin || acceptedInvite.role === 'admin';
      const role: 'admin' | 'member' = isWorkspaceAdmin ? 'admin' : 'member';
      const rawPerms = acceptedInvite.permissions;
      const basePerms = isWorkspaceAdmin ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS;
      const permissions: WorkspacePermissions = rawPerms && typeof rawPerms === 'object'
        ? { ...basePerms, ...rawPerms }
        : basePerms;

      let userTeamIds: string[] = [];
      if (!isWorkspaceAdmin) {
        userTeamIds = await fetchTeamIdsDirect(userId, tenantId);
      }

      return {
        isAuthorized: true,
        role,
        isWorkspaceAdmin,
        permissions,
        userTeamIds,
      };
    }

    // 3. Fallback: check if user has team membership in this workspace
    const teamIds = await fetchTeamIdsDirect(userId, tenantId);
    if (teamIds.length > 0 || isPlatformAdmin) {
      const isWorkspaceAdmin = isPlatformAdmin;
      return {
        isAuthorized: true,
        role: isWorkspaceAdmin ? 'admin' : 'member',
        isWorkspaceAdmin,
        permissions: isWorkspaceAdmin ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS,
        userTeamIds: teamIds,
      };
    }

    return unauthorized;
  } catch (err) {
    console.error('[getUserWorkspaceAuthServer] error:', err);
    return unauthorized;
  }
});

/**
 * Check if a user has a specific functional workspace permission within a tenant.
 */
export async function hasWorkspacePermission(
  userId: string,
  tenantId: string,
  permission: keyof WorkspacePermissions
): Promise<boolean> {
  const auth = await getUserWorkspaceAuthServer(userId, tenantId);
  if (!auth.isAuthorized) return false;
  return Boolean(auth.permissions[permission]);
}

/**
 * Get assigned team IDs for a user in a tenant.
 */
export async function getUserTeamIdsServer(userId: string, tenantId: string): Promise<string[]> {
  const auth = await getUserWorkspaceAuthServer(userId, tenantId);
  return auth.userTeamIds;
}

/**
 * Get active teams for a tenant.
 * If userId is provided and the user is a Team Member (not Workspace Admin),
 * returns only teams the user is authorized to access.
 */
export async function getTeamsServer(tenantId: string, userId?: string): Promise<Team[]> {
  if (!db || !tenantId) return [];

  try {
    let authorizedTeamIds: string[] | null = null;

    if (userId) {
      const role = await getEffectiveWorkspaceRole(userId, tenantId);
      const isWorkspaceAdmin = role === 'admin';
      if (!isWorkspaceAdmin) {
        authorizedTeamIds = await getUserTeamIdsServer(userId, tenantId);
      }
    }

    let query = db
      .from('teams')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (authorizedTeamIds !== null) {
      if (authorizedTeamIds.length === 0) {
        return [];
      }
      query = query.in('id', authorizedTeamIds);
    }

    const { data: teams, error } = await query;

    if (error) {
      return [];
    }

    if (!teams || teams.length === 0) return [];

    // Fetch member counts in parallel
    const teamIds = teams.map((t: any) => t.id);
    const { data: members } = await db
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds)
      .eq('tenant_id', tenantId);

    const countMap = new Map<string, number>();
    (members || []).forEach((m: any) => {
      countMap.set(m.team_id, (countMap.get(m.team_id) || 0) + 1);
    });

    return teams.map((team: any) => ({
      ...team,
      member_count: countMap.get(team.id) || 0,
    }));
  } catch (err) {
    console.warn('[getTeamsServer] warning:', err);
    return [];
  }
}

export interface TeamManagementData {
  teams: Team[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

/**
 * Unified resolver for Workspace Settings: Teams & Members.
 * Fetches users, invitations, teams, and team memberships in a single parallel database pass.
 */
export async function getTeamManagementDataServer(tenantId: string, userId?: string): Promise<TeamManagementData> {
  const empty: TeamManagementData = { teams: [], members: [], invitations: [] };
  if (!db || !tenantId) return empty;

  try {
    let authorizedTeamIds: string[] | null = null;
    if (userId) {
      const auth = await getUserWorkspaceAuthServer(userId, tenantId);
      if (!auth.isWorkspaceAdmin) {
        authorizedTeamIds = auth.userTeamIds;
      }
    }

    const [primaryUsersRes, allInvitesRes, teamsRes, teamMembersRes] = await Promise.all([
      db.from('users').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
      db.from('workspace_invitations').select('*').eq('tenant_id', tenantId),
      db.from('teams').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name', { ascending: true }),
      db.from('team_members').select('team_id, user_id').eq('tenant_id', tenantId)
    ]);

    const primaryUsers = primaryUsersRes.data || [];
    const allInvites = allInvitesRes.data || [];
    let teamsData = teamsRes.data || [];
    const teamMembers = teamMembersRes.data || [];

    // Filter teams if user is a Team Member with restricted teams
    if (authorizedTeamIds !== null) {
      teamsData = teamsData.filter((t: any) => authorizedTeamIds!.includes(t.id));
    }

    const teamMap = new Map<string, Team>(teamsData.map((t: any) => [t.id, t]));
    const userTeamsMap = new Map<string, Team[]>();
    const teamMemberCountMap = new Map<string, number>();

    teamMembers.forEach((tm: any) => {
      teamMemberCountMap.set(tm.team_id, (teamMemberCountMap.get(tm.team_id) || 0) + 1);
      const team = teamMap.get(tm.team_id);
      if (team) {
        const existing = userTeamsMap.get(tm.user_id) || [];
        existing.push(team);
        userTeamsMap.set(tm.user_id, existing);
      }
    });

    const teams: Team[] = teamsData.map((team: any) => ({
      ...team,
      member_count: teamMemberCountMap.get(team.id) || 0,
    }));

    const acceptedInvites = allInvites.filter((i: any) => i.status === 'accepted');
    const now = new Date().toISOString();
    const pendingInvites = allInvites.filter((i: any) => i.status === 'pending' && i.expires_at > now)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const memberMap = new Map<string, WorkspaceMember>();

    // 1. Add primary users
    primaryUsers.forEach((u: any) => {
      if (u.workspace_role === 'removed' || u.workspace_role === 'inactive' || u.workspace_role === 'none') {
        return;
      }
      const isWorkspaceAdmin = u.workspace_role === 'admin';
      const workspaceRole: 'admin' | 'member' = isWorkspaceAdmin ? 'admin' : 'member';
      const permissions: WorkspacePermissions = u.permissions && typeof u.permissions === 'object'
        ? { ...(workspaceRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS), ...u.permissions }
        : (workspaceRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS);

      memberMap.set(u.id, {
        id: u.id,
        tenant_id: tenantId,
        name: u.name || u.email.split('@')[0],
        email: u.email,
        role: u.role || 'user',
        workspace_role: workspaceRole,
        permissions,
        created_at: u.created_at,
        teams: userTeamsMap.get(u.id) || []
      });
    });

    // 2. Add invited multi-workspace users
    if (acceptedInvites.length > 0) {
      const acceptedEmails = acceptedInvites.map((inv: any) => String(inv.email).toLowerCase().trim());
      const { data: invitedUsers } = await db
        .from('users')
        .select('*')
        .in('email', acceptedEmails);

      (invitedUsers || []).forEach((u: any) => {
        if (!memberMap.has(u.id)) {
          const inv = acceptedInvites.find((i: any) => String(i.email).toLowerCase().trim() === u.email.toLowerCase().trim());
          const isWorkspaceAdmin = inv?.role === 'admin';
          const workspaceRole: 'admin' | 'member' = isWorkspaceAdmin ? 'admin' : 'member';
          const permissions: WorkspacePermissions = inv?.permissions && typeof inv.permissions === 'object'
            ? { ...(workspaceRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS), ...inv.permissions }
            : (workspaceRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS);

          memberMap.set(u.id, {
            id: u.id,
            tenant_id: tenantId,
            name: u.name || u.email.split('@')[0],
            email: u.email,
            role: u.role || 'user',
            workspace_role: workspaceRole,
            permissions,
            created_at: inv?.created_at || u.created_at,
            teams: userTeamsMap.get(u.id) || []
          });
        }
      });
    }

    // 3. Format pending invitations with assigned team objects
    const invitations: WorkspaceInvitation[] = pendingInvites.map((inv: any) => {
      const teamIds: string[] = Array.isArray(inv.team_ids) ? inv.team_ids : [];
      const assignedTeams = teamIds.map((tid) => teamMap.get(tid)).filter(Boolean) as Team[];
      return {
        ...inv,
        teams: assignedTeams
      };
    });

    return {
      teams,
      members: Array.from(memberMap.values()),
      invitations
    };
  } catch (err) {
    console.error('[getTeamManagementDataServer] error:', err);
    return empty;
  }
}

/**
 * Get all workspace members (users) along with their assigned teams and permissions.
 * Seamlessly supports both primary workspace members and invited multi-workspace members.
 */
export async function getWorkspaceMembersServer(tenantId: string): Promise<WorkspaceMember[]> {
  const data = await getTeamManagementDataServer(tenantId);
  return data.members;
}

/**
 * Get effective workspace role for a user in a tenant.
 */
export async function getEffectiveWorkspaceRole(userId: string, tenantId: string): Promise<'admin' | 'member'> {
  const auth = await getUserWorkspaceAuthServer(userId, tenantId);
  return auth.role;
}

export interface UserWorkspaceInfo {
  id: string;
  name: string;
  plan_type: string;
  is_current: boolean;
  workspace_role: 'admin' | 'member';
  created_at?: string;
}

/**
 * Get all workspaces accessible by a user (primary + accepted multi-workspace invitations).
 */
export async function getUserWorkspacesServer(userId: string, currentTenantId?: string): Promise<UserWorkspaceInfo[]> {
  if (!db || !userId) return [];
  try {
    const { data: user, error } = await db
      .from('users')
      .select('id, email, tenant_id, role, workspace_role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) return [];

    const cleanEmail = (user.email || '').toLowerCase().trim();

    // 1. Fetch primary tenant (only if not marked removed/inactive)
    const isPrimaryActive = user.workspace_role !== 'removed' && user.workspace_role !== 'inactive' && user.workspace_role !== 'none';
    const primaryTenantPromise = (user.tenant_id && isPrimaryActive)
      ? db.from('tenants').select('id, name, plan_type, created_at').eq('id', user.tenant_id).maybeSingle()
      : Promise.resolve({ data: null, error: null });

    // 2. Fetch accepted workspace invitations for this user's email
    const acceptedInvitesPromise = cleanEmail
      ? db.from('workspace_invitations').select('tenant_id, role, created_at').eq('email', cleanEmail).eq('status', 'accepted')
      : Promise.resolve({ data: [], error: null });

    const [primaryRes, invitesRes] = await Promise.all([primaryTenantPromise, acceptedInvitesPromise]);

    const workspacesMap = new Map<string, UserWorkspaceInfo>();

    // Add primary workspace
    if (primaryRes.data && isPrimaryActive) {
      const p = primaryRes.data;
      const isWsAdmin = user.workspace_role === 'member' ? false : true;
      workspacesMap.set(p.id, {
        id: p.id,
        name: p.name || 'Primary Workspace',
        plan_type: p.plan_type || 'starter',
        is_current: currentTenantId ? p.id === currentTenantId : true,
        workspace_role: isWsAdmin ? 'admin' : 'member',
        created_at: p.created_at
      });
    }

    // Add accepted multi-workspaces
    const acceptedInvites = invitesRes.data || [];
    if (acceptedInvites.length > 0) {
      const tenantIds = acceptedInvites.map((inv: any) => inv.tenant_id).filter((tid: string) => tid && !workspacesMap.has(tid));
      
      if (tenantIds.length > 0) {
        const { data: otherTenants } = await db
          .from('tenants')
          .select('id, name, plan_type, created_at')
          .in('id', tenantIds);

        (otherTenants || []).forEach((t: any) => {
          const inv = acceptedInvites.find((i: any) => i.tenant_id === t.id);
          workspacesMap.set(t.id, {
            id: t.id,
            name: t.name || 'PingStack Workspace',
            plan_type: t.plan_type || 'starter',
            is_current: currentTenantId ? t.id === currentTenantId : false,
            workspace_role: inv?.role === 'admin' ? 'admin' : 'member',
            created_at: t.created_at
          });
        });
      }
    }

    return Array.from(workspacesMap.values());
  } catch (err) {
    console.error('[getUserWorkspacesServer] error:', err);
    return [];
  }
}

/**
 * Get pending invitations for a workspace.
 */
export async function getWorkspaceInvitationsServer(tenantId: string): Promise<WorkspaceInvitation[]> {
  const data = await getTeamManagementDataServer(tenantId);
  return data.invitations;
}

/**
 * Get conversation assignments for candidate contact IDs in a tenant.
 */
export async function getConversationAssignmentsServer(
  tenantId: string,
  contactIds: string[]
): Promise<Map<string, ConversationAssignment>> {
  const assignmentMap = new Map<string, ConversationAssignment>();
  if (!db || !tenantId || contactIds.length === 0) return assignmentMap;

  try {
    const { data: assignments, error } = await db
      .from('conversation_assignments')
      .select('*, teams(id, name, color), users(id, name, email)')
      .eq('tenant_id', tenantId)
      .in('contact_id', contactIds);

    if (error || !assignments) return assignmentMap;

    assignments.forEach((a: any) => {
      assignmentMap.set(a.contact_id, {
        id: a.id,
        tenant_id: a.tenant_id,
        contact_id: a.contact_id,
        team_id: a.team_id,
        assigned_user_id: a.assigned_user_id,
        status: a.status || 'open',
        team: a.teams ? { id: a.teams.id, name: a.teams.name, color: a.teams.color } : null,
        assigned_user: a.users ? { id: a.users.id, name: a.users.name, email: a.users.email } : null,
        created_at: a.created_at,
        updated_at: a.updated_at
      });
    });

    return assignmentMap;
  } catch (err) {
    console.warn('[getConversationAssignmentsServer] warning:', err);
    return assignmentMap;
  }
}

/**
 * Assign a conversation to a team and/or agent.
 */
export async function assignConversationServer({
  tenantId,
  contactId,
  teamId,
  assignedUserId,
  status = 'open'
}: {
  tenantId: string;
  contactId: string;
  teamId?: string | null;
  assignedUserId?: string | null;
  status?: string;
}): Promise<{ success: boolean; assignment?: ConversationAssignment; error?: string }> {
  if (!db || !tenantId || !contactId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const now = new Date().toISOString();
    const finalTeamId = teamId === undefined ? null : teamId;
    const finalAssignedUserId = assignedUserId === undefined ? null : assignedUserId;

    const { data: a, error } = await db
      .from('conversation_assignments')
      .upsert(
        {
          tenant_id: tenantId,
          contact_id: contactId,
          team_id: finalTeamId,
          assigned_user_id: finalAssignedUserId,
          status: status || 'open',
          updated_at: now
        },
        { onConflict: 'tenant_id,contact_id' }
      )
      .select('*, teams(id, name, color), users(id, name, email)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      assignment: {
        id: a.id,
        tenant_id: a.tenant_id,
        contact_id: a.contact_id,
        team_id: a.team_id,
        assigned_user_id: a.assigned_user_id,
        status: a.status,
        team: a.teams ? { id: a.teams.id, name: a.teams.name, color: a.teams.color } : null,
        assigned_user: a.users ? { id: a.users.id, name: a.users.name, email: a.users.email } : null,
        created_at: a.created_at,
        updated_at: a.updated_at
      }
    };
  } catch (err: any) {
    console.error('[assignConversationServer] error:', err);
    return { success: false, error: err?.message || 'Assignment failed' };
  }
}

/**
 * Generate a secure cryptographically random invitation token.
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
