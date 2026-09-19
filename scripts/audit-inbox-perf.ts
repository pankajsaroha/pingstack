import '../src/lib/load-env';
import { dbAdmin as db } from '../src/lib/db';
import { getConversationsServer, getInitialMessagesServer } from '../src/lib/server/chat';
import { getContactsServer } from '../src/lib/server/contacts';
import { getTemplatesServer } from '../src/lib/server/templates';
import { getTeamsServer, getWorkspaceMembersServer } from '../src/lib/server/teams';

async function auditPerformance() {
  console.log('--- AUDITING INBOX PERFORMANCE (POST-OPTIMIZATION) ---');

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

  // 1. Measure Optimized Fast-Path Server Execution
  console.log('\n--- 1. Optimized SSR Fast-Path Latency ---');

  const tFastStart = performance.now();
  const convs = await getConversationsServer(tenantId, userId);
  const firstContactId = convs.length > 0 ? convs[0].contact.id : null;
  const initialMessages = firstContactId ? await getInitialMessagesServer(tenantId, firstContactId, 20) : [];
  const tFast = performance.now() - tFastStart;

  console.log(`Optimized SSR critical path (getConversationsServer + getInitialMessagesServer): ${tFast.toFixed(2)}ms`);
  console.log(`Conversations loaded: ${convs.length}, Initial Messages loaded: ${initialMessages.length}`);

  // 2. Measure Individual Server Queries
  console.log('\n--- 2. Individual Server Functions Latency ---');

  const t0 = performance.now();
  await getConversationsServer(tenantId, userId);
  const tConvs = performance.now() - t0;
  console.log(`getConversationsServer (Optimized): ${tConvs.toFixed(2)}ms`);

  const t1 = performance.now();
  await getContactsServer(tenantId, 50);
  const tContacts = performance.now() - t1;
  console.log(`getContactsServer (Background): ${tContacts.toFixed(2)}ms`);

  const t2 = performance.now();
  await getTemplatesServer(tenantId);
  const tTemplates = performance.now() - t2;
  console.log(`getTemplatesServer (Background/Lazy): ${tTemplates.toFixed(2)}ms`);

  const t3 = performance.now();
  const teams = await getTeamsServer(tenantId, userId);
  const tTeams = performance.now() - t3;
  console.log(`getTeamsServer (Background): ${tTeams.toFixed(2)}ms (${teams.length} teams)`);

  const t4 = performance.now();
  const members = await getWorkspaceMembersServer(tenantId);
  const tMembers = performance.now() - t4;
  console.log(`getWorkspaceMembersServer (Background): ${tMembers.toFixed(2)}ms (${members.length} members)`);

  // 3. Breakdown of sub-queries inside getConversationsServer
  console.log('\n--- 3. Sub-queries inside getConversationsServer ---');
  
  const tSub0 = performance.now();
  const { getUserWorkspaceAuthServer } = await import('../src/lib/server/teams');
  const auth = await getUserWorkspaceAuthServer(userId!, tenantId);
  const tAuth = performance.now() - tSub0;
  console.log(`- getUserWorkspaceAuthServer (Unified Cached Auth): ${tAuth.toFixed(2)}ms (isAuthorized: ${auth.isAuthorized}, role: ${auth.role}, teams: ${auth.userTeamIds.length})`);

  const tSub3 = performance.now();
  const latestMessagesRes = await db.from('conversations_view').select('*').eq('tenant_id', tenantId);
  const tConvsView = performance.now() - tSub3;
  console.log(`- conversations_view: ${tConvsView.toFixed(2)}ms`);

  const latestMessages = (latestMessagesRes.data || []).filter((m: any) => m.contact_id !== null && m.contact_id !== undefined);
  const candidateContactIds = Array.from(new Set(latestMessages.map((m: any) => m.contact_id).filter(Boolean)));

  const tSub4 = performance.now();
  const contactsRes = candidateContactIds.length > 0
    ? await db.from('contacts').select('*').in('id', candidateContactIds).eq('tenant_id', tenantId)
    : { data: [] };
  const tContactsQuery = performance.now() - tSub4;
  console.log(`- contacts query: ${tContactsQuery.toFixed(2)}ms`);

  const tSub5 = performance.now();
  const unreadCountsRes = await db.from('unread_counts_view').select('*').eq('tenant_id', tenantId);
  const tUnread = performance.now() - tSub5;
  console.log(`- unread_counts_view: ${tUnread.toFixed(2)}ms`);

  const tSub6 = performance.now();
  const activeInteractionsRes = candidateContactIds.length > 0
    ? await db.from('messages')
        .select('contact_id')
        .in('contact_id', candidateContactIds)
        .eq('tenant_id', tenantId)
        .or('direction.eq.inbound,campaign_id.is.null')
    : { data: [] };
  const tActive = performance.now() - tSub6;
  console.log(`- activeInteractions query: ${tActive.toFixed(2)}ms`);

  const tSub7 = performance.now();
  const { getConversationAssignmentsServer } = await import('../src/lib/server/teams');
  await getConversationAssignmentsServer(tenantId, candidateContactIds as string[]);
  const tAssign = performance.now() - tSub7;
  console.log(`- getConversationAssignmentsServer: ${tAssign.toFixed(2)}ms`);

  process.exit(0);
}

auditPerformance().catch(e => {
  console.error(e);
  process.exit(1);
});
