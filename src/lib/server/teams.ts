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

/**
 * Check if a user has a specific functional workspace permission within a tenant.
 */
export async function hasWorkspacePermission(
  userId: string,
  tenantId: string,
  permission: keyof WorkspacePermissions
): Promise<boolean> {
  if (!db || !userId || !tenantId) return false;

  try {
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !user) return false;

    // Platform Admins and Workspace Admins have full access across all capabilities
    if (user.role === 'admin' || user.role === 'superadmin' || user.workspace_role === 'admin') {
      return true;
    }

    // Check custom configured permissions if available on user
    const userPermissions = user.permissions;
    if (userPermissions && typeof userPermissions === 'object' && typeof userPermissions[permission] === 'boolean') {
      return userPermissions[permission];
    }

    // Fallback to safe defaults for Team Members
    return DEFAULT_TEAM_MEMBER_PERMISSIONS[permission] ?? false;
  } catch (err) {
    console.error('[hasWorkspacePermission] error:', err);
    return false;
  }
}

/**
 * Get assigned team IDs for a user in a tenant.
 */
export async function getUserTeamIdsServer(userId: string, tenantId: string): Promise<string[]> {
  if (!db || !userId || !tenantId) return [];
  try {
    const { data, error } = await db
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error || !data) return [];
    return data.map((tm: any) => tm.team_id);
  } catch (err) {
    return [];
  }
}

/**
 * Get all active teams for a tenant with member counts.
 */
export async function getTeamsServer(tenantId: string): Promise<Team[]> {
  if (!db || !tenantId) return [];

  try {
    const { data: teams, error } = await db
      .from('teams')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

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

/**
 * Get all workspace members (users) along with their assigned teams and permissions.
 */
export async function getWorkspaceMembersServer(tenantId: string): Promise<WorkspaceMember[]> {
  if (!db || !tenantId) return [];

  try {
    const [usersRes, teamsRes, teamMembersRes] = await Promise.all([
      db.from('users').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
      db.from('teams').select('*').eq('tenant_id', tenantId).eq('is_active', true),
      db.from('team_members').select('team_id, user_id').eq('tenant_id', tenantId)
    ]);

    if (usersRes.error) return [];

    const users = usersRes.data || [];
    const teams = teamsRes.data || [];
    const teamMembers = teamMembersRes.data || [];

    const teamMap = new Map<string, Team>(teams.map((t: any) => [t.id, t]));
    const userTeamsMap = new Map<string, Team[]>();

    teamMembers.forEach((tm: any) => {
      const team = teamMap.get(tm.team_id);
      if (team) {
        const existing = userTeamsMap.get(tm.user_id) || [];
        existing.push(team);
        userTeamsMap.set(tm.user_id, existing);
      }
    });

    return users.map((u: any) => {
      const isWorkspaceAdmin = u.workspace_role === 'admin' || u.role === 'admin' || u.role === 'superadmin';
      const workspaceRole: 'admin' | 'member' = isWorkspaceAdmin ? 'admin' : 'member';
      const permissions: WorkspacePermissions = u.permissions && typeof u.permissions === 'object'
        ? { ...(workspaceRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS), ...u.permissions }
        : (workspaceRole === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_TEAM_MEMBER_PERMISSIONS);

      return {
        id: u.id,
        tenant_id: u.tenant_id,
        name: u.name || u.email.split('@')[0],
        email: u.email,
        role: u.role || 'user',
        workspace_role: workspaceRole,
        permissions,
        created_at: u.created_at,
        teams: userTeamsMap.get(u.id) || []
      };
    });
  } catch (err) {
    console.warn('[getWorkspaceMembersServer] warning:', err);
    return [];
  }
}

/**
 * Get pending invitations for a workspace.
 */
export async function getWorkspaceInvitationsServer(tenantId: string): Promise<WorkspaceInvitation[]> {
  if (!db || !tenantId) return [];

  try {
    const { data: invitations, error } = await db
      .from('workspace_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return [];
    return invitations || [];
  } catch (err) {
    return [];
  }
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
    // Check if assignment already exists
    const { data: existing } = await db
      .from('conversation_assignments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .maybeSingle();

    const now = new Date().toISOString();
    let result;

    if (existing) {
      result = await db
        .from('conversation_assignments')
        .update({
          team_id: teamId !== undefined ? teamId : null,
          assigned_user_id: assignedUserId !== undefined ? assignedUserId : null,
          status,
          updated_at: now
        })
        .eq('id', existing.id)
        .select('*, teams(id, name, color), users(id, name, email)')
        .single();
    } else {
      result = await db
        .from('conversation_assignments')
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          team_id: teamId || null,
          assigned_user_id: assignedUserId || null,
          status,
          created_at: now,
          updated_at: now
        })
        .select('*, teams(id, name, color), users(id, name, email)')
        .single();
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    const a = result.data;
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
    return { success: false, error: err?.message || 'Assignment failed' };
  }
}

/**
 * Generate a secure cryptographically random invitation token.
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
