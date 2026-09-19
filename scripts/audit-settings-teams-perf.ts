import '../src/lib/load-env';
import { dbAdmin as db } from '../src/lib/db';
import { getTeamsServer, getWorkspaceMembersServer, getWorkspaceInvitationsServer, getTeamManagementDataServer } from '../src/lib/server/teams';

async function auditSettingsTeamsPerformance() {
  console.log('--- AUDITING SETTINGS: TEAMS & WORKSPACE MEMBERS PERFORMANCE (POST-OPTIMIZATION) ---');

  if (!db) {
    console.error('Database client unavailable');
    process.exit(1);
  }

  // Get a tenant and user for testing
  const { data: tenant } = await db.from('tenants').select('id, name').limit(1).single();
  if (!tenant) {
    console.error('No tenant found in DB');
    process.exit(1);
  }
  const tenantId = tenant.id;

  const { data: user } = await db.from('users').select('id, email, workspace_role').eq('tenant_id', tenantId).limit(1).single();
  const userId = user?.id;

  console.log(`Auditing Tenant: ${tenant.name} (${tenantId}), User: ${user?.email} (${userId}, role: ${user?.workspace_role})`);

  // 1. Measure Optimized Single-Pass Server Function
  console.log('\n--- 1. Optimized Single-Pass Resolver (getTeamManagementDataServer) ---');

  const t0 = performance.now();
  const data = await getTeamManagementDataServer(tenantId, userId);
  const tOptimized = performance.now() - t0;
  console.log(`getTeamManagementDataServer (Consolidated): ${tOptimized.toFixed(2)}ms (Teams: ${data.teams.length}, Members: ${data.members.length}, Invitations: ${data.invitations.length})`);

  // 2. Measure Individual Server Functions (Now reusing consolidated logic)
  console.log('\n--- 2. Individual Server Functions Latency ---');

  const t1 = performance.now();
  const teams = await getTeamsServer(tenantId, userId);
  const tTeams = performance.now() - t1;
  console.log(`getTeamsServer: ${tTeams.toFixed(2)}ms (${teams.length} teams)`);

  const t2 = performance.now();
  const members = await getWorkspaceMembersServer(tenantId);
  const tMembers = performance.now() - t2;
  console.log(`getWorkspaceMembersServer: ${tMembers.toFixed(2)}ms (${members.length} members)`);

  const t3 = performance.now();
  const invitations = await getWorkspaceInvitationsServer(tenantId);
  const tInv = performance.now() - t3;
  console.log(`getWorkspaceInvitationsServer: ${tInv.toFixed(2)}ms (${invitations.length} invitations)`);

  process.exit(0);
}

auditSettingsTeamsPerformance().catch(e => {
  console.error(e);
  process.exit(1);
});
