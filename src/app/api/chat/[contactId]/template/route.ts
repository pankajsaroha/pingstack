import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contactId } = await params;
  const { templateName, language } = await req.json();

  if (!templateName) return NextResponse.json({ error: 'Template name required' }, { status: 400 });

  try {
    // 1. Get contact info
    const { data: contact } = await db.from('contacts')
      .select('phone_number')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single();

    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    // 2. Get the template content for the inbox record
    const { data: template } = await db.from('templates')
      .select('content')
      .eq('name', templateName)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    // 3. Create the message record
    const { data: msg, error } = await db.from('messages').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      phone_number: contact.phone_number,
      direction: 'outbound',
      content: template?.content || `[Template: ${templateName}]`,
      status: 'pending'
    }).select().single();

    if (error) throw error;

    // 4. Queue the job
    console.log(`[Queue] Adding template message job to Redis for contact ${contactId}...`);
    await messageQueue.add('send-whatsapp', {
      messageId: msg.id,
      phone: contact.phone_number,
      templateId: templateName,
      templateLanguage: language || 'en_US',
      isDirectText: false,
      components: [] // Simple templates for now, can be extended later for params
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    console.error('Send Template Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
