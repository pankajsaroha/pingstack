import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const before = searchParams.get('before');

  let query = db.from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Return reversed to maintain chronological order in UI
  return NextResponse.json(data?.reverse() || []);
}

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId } = await params;

  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: 'Message content required' }, { status: 400 });

  const { data: contact } = await db.from('contacts').select('phone_number').eq('id', contactId).single();
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const { data: msg, error } = await db.from('messages').insert({
    tenant_id: tenantId,
    contact_id: contactId,
    phone_number: contact.phone_number,
    direction: 'outbound',
    content: content,
    status: 'pending'
  }).select().single();

  if (error || !msg) return NextResponse.json({ error: 'Failed' }, { status: 500 });

  const { messageQueue } = await import('@/lib/queue');
  await messageQueue.add('send-whatsapp', {
    messageId: msg.id,
    phone: contact.phone_number,
    isDirectText: true,
    textContent: content
  });

  return NextResponse.json(msg);
}
