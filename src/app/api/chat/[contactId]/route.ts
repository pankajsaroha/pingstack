import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { contactId: string } }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await db.from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', params.contactId)
    .order('created_at', { ascending: true }); 

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: { contactId: string } }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content } = await req.json();
  if (!content) return NextResponse.json({ error: 'Message content required' }, { status: 400 });

  const { data: contact } = await db.from('contacts').select('phone_number').eq('id', params.contactId).single();
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const { data: msg, error } = await db.from('messages').insert({
    tenant_id: tenantId,
    contact_id: params.contactId,
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
