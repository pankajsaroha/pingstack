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

    const [
      contactsRes,
      latestMessagesRes,
      unreadCountsRes
    ] = await Promise.all([
      db.from('contacts').select('*').eq('tenant_id', tenantId),
      db.from('conversations_view').select('*').eq('tenant_id', tenantId),
      db.from('unread_counts_view').select('*').eq('tenant_id', tenantId)
    ]);

    if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });

    const contacts = contactsRes.data || [];
    const latestMessages = latestMessagesRes.data || [];
    const unreadCounts = unreadCountsRes.data || [];

    // Map latest messages and unread counts for fast O(1) lookup
    const latestMessageMap = new Map<string, any>(latestMessages.map(m => [m.contact_id, m]));
    const unreadCountMap = new Map<string, number>(unreadCounts.map(c => [c.contact_id, c.unread_count]));

    const conversations = contacts.map((contact: any) => {
      const latestMessage = latestMessageMap.get(contact.id) || null;
      const unreadCount = unreadCountMap.get(contact.id) || 0;
      return {
        contact,
        latestMessage,
        unreadCount
      };
    }).filter((c: any) => c.latestMessage !== null)
    .sort((a: any, b: any) => new Date(b.latestMessage!.created_at).getTime() - new Date(a.latestMessage!.created_at).getTime());

    return NextResponse.json(conversations);

  } catch (err: any) {
    console.error('Conversations Load Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load conversations' }, { status: 500 });
  }
}
