import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: contacts, error: cErr } = await db.from('contacts').select('*').eq('tenant_id', tenantId);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const { data: messages } = await db.from('messages')
    .select('id, contact_id, content, direction, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  const conversations = (contacts || []).map(contact => {
    const contactMsgs = (messages || []).filter(m => m.contact_id === contact.id);
    return {
      contact,
      latestMessage: contactMsgs.length > 0 ? contactMsgs[0] : null,
      unreadCount: contactMsgs.filter(m => m.direction === 'inbound' && m.status === 'received').length
    };
  }).filter(c => c.latestMessage !== null)
  .sort((a, b) => new Date(b.latestMessage!.created_at).getTime() - new Date(a.latestMessage!.created_at).getTime());

  return NextResponse.json(conversations);
}
