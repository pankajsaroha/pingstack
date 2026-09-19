import '../src/lib/load-env';
import { dbAdmin as db } from '../src/lib/db';
import { Team, WorkspaceMember, WorkspaceInvitation } from '../src/types';

// Consolidated helper simulation
async function getUnifiedTeamManagementData(tenantId: string, userId?: string) {
  if (!db || !tenantId) return { teams: [], members: [], invitations: [] };

  const [primaryUsersRes, allInvitesRes, teamsRes, teamMembersRes] = await Promise.all([
    db.from('users').select('id, name, email, role, workspace_role, permissions, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
    db.from('workspace_invitations').select('*').eq('tenant_id', tenantId),
    db.from('teams').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name', { ascending: true }),
    db.from('team_members').select('team_id, user_id').eq('tenant_id', tenantId)
  ]);

  const primaryUsers = primaryUsersRes.data || [];
  const allInvites = allInvitesRes.data || [];
  const teamsData = teamsRes.data || [];
  const teamMembers = teamMembersRes.data || [];

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

  const teams: Team[] = teamsData.map((t: any) => ({
    ...t,
    member_count: teamMemberCountMap.get(t.id) || 0,
  }));

  // Filter accepted vs pending invitations
  const acceptedInvites = allInvites.filter((i: any) => i.status === 'accepted');
  const pendingInvites = allInvites.filter((i: any) => i.status === 'pending' && new Date(i.expires_at) > new Date());

  // Workspace Members map
  const memberMap = new Map<string, WorkspaceMember>();

  primaryUsers.forEach((u: any) => {
    if (u.workspace_role === 'removed' || u.workspace_role === 'inactive' || u.workspace_role === 'none') return;
    const isWsAdmin = u.workspace_role === 'admin';
    memberMap.set(u.id, {
      id: u.id,
      tenant_id: tenantId,
      name: u.name || u.email.split('@')[0],
      email: u.email,
      role: u.role || 'user',
      workspace_role: isWsAdmin ? 'admin' : 'member',
      permissions: u.permissions || {},
      created_at: u.created_at,
      teams: userTeamsMap.get(u.id) || []
    });
  });

  // Invited multi-workspace members
  if (acceptedInvites.length > 0) {
    const acceptedEmails = acceptedInvites.map((inv: any) => String(inv.email).toLowerCase().trim());
    const { data: invitedUsers } = await db.from('users').select('id, name, email, role, created_at').in('email', acceptedEmails);
    (invitedUsers || []).forEach((u: any) => {
      if (!memberMap.has(u.id)) {
        const inv = acceptedInvites.find((i: any) => String(i.email).toLowerCase().trim() === u.email.toLowerCase().trim());
        const isWsAdmin = inv?.role === 'admin';
        memberMap.set(u.id, {
          id: u.id,
          tenant_id: tenantId,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          role: u.role || 'user',
          workspace_role: isWsAdmin ? 'admin' : 'member',
          permissions: inv?.permissions || {},
          created_at: inv?.created_at || u.created_at,
          teams: userTeamsMap.get(u.id) || []
        });
      }
    });
  }

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
}

async function runBenchmark() {
  const { data: tenant } = await db!.from('tenants').select('id, name').limit(1).single();
  const tenantId = tenant!.id;

  console.log('Testing unified query execution speed:');
  const t0 = performance.now();
  const result = await getUnifiedTeamManagementData(tenantId);
  const tUnified = performance.now() - t0;
  console.log(`Unified single-roundtrip query: ${tUnified.toFixed(2)}ms (Teams: ${result.teams.length}, Members: ${result.members.length}, Invs: ${result.invitations.length})`);
  process.exit(0);
}

runBenchmark().catch(console.error);
