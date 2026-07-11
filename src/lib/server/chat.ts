import { dbAdmin as db } from '@/lib/db';
import { Conversation } from '@/types';

export async function getConversationsServer(tenantId: string): Promise<Conversation[]> {
  if (!db) return [];

  try {
    const latestMessagesRes = await db.from('conversations_view').select('*').eq('tenant_id', tenantId);
    if (latestMessagesRes.error) throw latestMessagesRes.error;
    
    // Filter out messages that have no associated contact_id (due to deleted contacts)
    const latestMessages = (latestMessagesRes.data || []).filter(m => m.contact_id !== null && m.contact_id !== undefined);
    const activeContactIds = Array.from(new Set(latestMessages.map(m => m.contact_id).filter(Boolean)));

    const [contactsRes, unreadCountsRes] = await Promise.all([
      activeContactIds.length > 0
        ? db.from('contacts').select('*').in('id', activeContactIds).eq('tenant_id', tenantId)
        : Promise.resolve({ data: [], error: null }),
      db.from('unread_counts_view').select('*').eq('tenant_id', tenantId)
    ]);

    if (contactsRes.error) throw contactsRes.error;

    const contacts = contactsRes.data || [];
    const unreadCounts = unreadCountsRes.data || [];

    const contactMap = new Map<string, any>(contacts.map(c => [c.id, c]));
    const unreadCountMap = new Map<string, number>(unreadCounts.map(c => [c.contact_id, c.unread_count]));

    return latestMessages.map((message: any) => {
      const contact = contactMap.get(message.contact_id) || {
        id: message.contact_id || 'unknown',
        phone_number: '',
        name: 'Client ' + (message.contact_id ? message.contact_id.slice(-4) : 'unknown')
      };
      const unreadCount = unreadCountMap.get(message.contact_id) || 0;
      return {
        contact,
        latestMessage: message,
        unreadCount
      };
    }).sort((a: any, b: any) => new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime());

  } catch (err) {
    console.error('[getConversationsServer] error:', err);
    return [];
  }
}
