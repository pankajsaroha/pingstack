import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const limitCheck = await enforceRateLimit(tenantId, 'read_list');
    if (limitCheck.limited && limitCheck.response) {
      return limitCheck.response;
    }

    const latestMessagesRes = await db.from('conversations_view').select('*').eq('tenant_id', tenantId);
    if (latestMessagesRes.error) return NextResponse.json({ error: latestMessagesRes.error.message }, { status: 500 });
    
    // Filter out messages that have no associated contact_id (due to deleted contacts)
    const latestMessages = (latestMessagesRes.data || []).filter(m => m.contact_id !== null && m.contact_id !== undefined);
    const candidateContactIds = Array.from(new Set(latestMessages.map(m => m.contact_id).filter(Boolean)));

    const [contactsRes, unreadCountsRes, activeInteractionsRes, assignmentsMap] = await Promise.all([
      candidateContactIds.length > 0
        ? db.from('contacts').select('*').in('id', candidateContactIds).eq('tenant_id', tenantId)
        : Promise.resolve({ data: [], error: null }),
      db.from('unread_counts_view').select('*').eq('tenant_id', tenantId),
      candidateContactIds.length > 0
        ? db.from('messages')
            .select('contact_id')
            .in('contact_id', candidateContactIds)
            .eq('tenant_id', tenantId)
            .or('direction.eq.inbound,campaign_id.is.null')
        : Promise.resolve({ data: [], error: null }),
      import('@/lib/server/teams').then(m => m.getConversationAssignmentsServer(tenantId, candidateContactIds)).catch(() => new Map())
    ]);

    if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });

    const contacts = contactsRes.data || [];
    const unreadCounts = unreadCountsRes.data || [];
    const activeContactIds = new Set<string>(
      (activeInteractionsRes.data || []).map((m: any) => m.contact_id)
    );

    // Keep active conversations: contact replied (inbound) or received direct 1:1 message
    const visibleMessages = latestMessages.filter((m: any) => activeContactIds.has(m.contact_id));

    // Map contacts, latest messages and unread counts for fast O(1) lookup
    const contactMap = new Map<string, any>(contacts.map(c => [c.id, c]));
    const unreadCountMap = new Map<string, number>(unreadCounts.map(c => [c.contact_id, c.unread_count]));

    const userId = req.headers.get('x-user-id');
    let userTeamIds: string[] = [];
    let isWorkspaceAdmin = true;

    if (userId) {
      const { hasWorkspacePermission, getUserTeamIdsServer } = await import('@/lib/server/teams');
      const canViewInbox = await hasWorkspacePermission(userId, tenantId, 'inbox_view');
      if (!canViewInbox) {
        return NextResponse.json([]);
      }

      const { data: userRecord } = await db.from('users').select('role, workspace_role').eq('id', userId).eq('tenant_id', tenantId).maybeSingle();
      isWorkspaceAdmin = userRecord?.role === 'admin' || userRecord?.role === 'superadmin' || userRecord?.workspace_role === 'admin';
      if (!isWorkspaceAdmin) {
        userTeamIds = await getUserTeamIdsServer(userId, tenantId);
      }
    }

    const conversations = visibleMessages
      .map((message: any) => {
        const contact = contactMap.get(message.contact_id) || {
          id: message.contact_id || 'unknown',
          phone_number: '',
          name: 'Client ' + (message.contact_id ? message.contact_id.slice(-4) : 'unknown')
        };
        const unreadCount = unreadCountMap.get(message.contact_id) || 0;
        const assignment = assignmentsMap.get(message.contact_id) || null;
        return {
          contact,
          latestMessage: message,
          unreadCount,
          assignment
        };
      })
      .filter((conv: any) => {
        if (isWorkspaceAdmin || !userId) return true;
        const a = conv.assignment;
        // If conversation is assigned to a specific team, member must belong to that team
        if (a && a.team_id) {
          const isAssignedToUser = a.assigned_user_id === userId;
          const isInAssignedTeam = userTeamIds.includes(a.team_id);
          return isAssignedToUser || isInAssignedTeam;
        }
        // Unassigned or general queue: accessible if user has inbox_view
        return true;
      })
      .sort((a: any, b: any) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime());

    return NextResponse.json(conversations);

  } catch (err: any) {
    console.error('Conversations Load Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load conversations' }, { status: 500 });
  }
}
