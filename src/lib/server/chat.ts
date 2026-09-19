import { dbAdmin as db } from '@/lib/db';
import { Conversation } from '@/types';
import { getUserWorkspaceAuthServer } from '@/lib/server/teams';

/**
 * Pre-fetch initial messages for the active conversation during SSR.
 */
export async function getInitialMessagesServer(
  tenantId: string,
  contactId: string,
  limit: number = 20
): Promise<any[]> {
  if (!db || !tenantId || !contactId) return [];
  try {
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.reverse();
  } catch (err) {
    console.error('[getInitialMessagesServer] error:', err);
    return [];
  }
}

export async function getConversationsServer(tenantId: string, userId?: string, teamId?: string): Promise<Conversation[]> {
  if (!db || !tenantId) return [];

  try {
    // 1. Launch authorization resolution and conversations_view query in parallel
    const [authResult, latestMessagesRes] = await Promise.all([
      userId ? getUserWorkspaceAuthServer(userId, tenantId) : Promise.resolve(null),
      db.from('conversations_view').select('*').eq('tenant_id', tenantId)
    ]);

    let userTeamIds: string[] = [];
    let isWorkspaceAdmin = false;

    if (authResult) {
      if (!authResult.isAuthorized || !authResult.permissions.inbox_view) {
        return [];
      }
      isWorkspaceAdmin = authResult.isWorkspaceAdmin;
      userTeamIds = authResult.userTeamIds;
    }

    if (teamId && !isWorkspaceAdmin && !userTeamIds.includes(teamId)) {
      return [];
    }

    if (latestMessagesRes.error) throw latestMessagesRes.error;
    
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

    if (contactsRes.error) throw contactsRes.error;

    const contacts = contactsRes.data || [];
    const unreadCounts = unreadCountsRes.data || [];
    const activeContactIds = new Set<string>(
      (activeInteractionsRes.data || []).map((m: any) => m.contact_id)
    );

    // Keep active conversations: contact replied (inbound) or received direct 1:1 message
    const visibleMessages = latestMessages.filter((m: any) => activeContactIds.has(m.contact_id));

    const contactMap = new Map<string, any>(contacts.map(c => [c.id, c]));
    const unreadCountMap = new Map<string, number>(unreadCounts.map(c => [c.contact_id, c.unread_count]));

    return visibleMessages
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
        const a = conv.assignment;

        // If specific team was requested
        if (teamId) {
          return a?.team_id === teamId;
        }

        if (isWorkspaceAdmin || !userId) return true;

        // If assigned to a specific team, member must belong to that team or be directly assigned
        if (a && a.team_id) {
          const isAssignedToUser = a.assigned_user_id === userId;
          const isInAssignedTeam = userTeamIds.includes(a.team_id);
          return isAssignedToUser || isInAssignedTeam;
        }
        // If assigned directly to another member without a team, member cannot see it unless assigned to self
        if (a && a.assigned_user_id && !a.team_id) {
          return a.assigned_user_id === userId;
        }
        // Unassigned queue: accessible to member
        return true;
      })
      .sort((a: any, b: any) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime());

  } catch (err) {
    console.error('[getConversationsServer] error:', err);
    return [];
  }
}
