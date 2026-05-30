import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';
import { checkLimit, incrementUsage } from '@/lib/limits';

type SendMessagesBody = {
  contactIds?: unknown;
  template_id?: unknown;
  contactVars?: Record<string, string[]>;
};

type ContactRow = {
  id: string;
  phone_number: string;
};

type TemplateRow = {
  id: string;
  name: string;
  language: string | null;
  content: string | null;
};

type MessageInsert = {
  tenant_id: string;
  contact_id: string;
  phone_number: string;
  status: string;
  content: string | null;
  direction: string;
  message_type?: string;
  variables: string[];
};

type InsertedMessageRow = {
  id: string;
  phone_number: string;
  contact_id: string;
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { contactIds, template_id, contactVars = {} } = await req.json() as SendMessagesBody;
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0 || !template_id) {
      return NextResponse.json({ error: 'Invalid payload. contactIds (array) and template_id are required.' }, { status: 400 });
    }

    const canSendCampaign = await checkLimit(tenantId, 'campaigns');
    if (!canSendCampaign) {
      return NextResponse.json({ error: 'Upgrade to continue. You have reached your daily campaigns limit.' }, { status: 403 });
    }

    const selectedContactIds = contactIds.map(String);
    const selectedTemplateId = String(template_id);

    const { data: contactData, error: cErr } = await db.from('contacts')
      .select('id, phone_number')
      .in('id', selectedContactIds)
      .eq('tenant_id', tenantId);
    const contacts = contactData as ContactRow[] | null;

    if (cErr || !contacts) return NextResponse.json({ error: 'Database error' }, { status: 500 });
    if (contacts.length === 0) return NextResponse.json({ error: 'No valid contacts found' }, { status: 404 });

    const { data: templateData, error: tErr } = await db.from('templates')
      .select('id, name, language, content')
      .eq('id', selectedTemplateId)
      .eq('tenant_id', tenantId)
      .single();
    const template = templateData as TemplateRow | null;

    if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const messagesToInsert: MessageInsert[] = contacts.map((contact) => ({
      tenant_id: tenantId,
      contact_id: contact.id,
      phone_number: contact.phone_number,
      status: 'pending',
      content: template.content,
      direction: 'outbound',
      message_type: 'template',
      variables: contactVars[contact.id] || [],
    }));

    let { data: insertedMsgsData, error: mErr } = await db
      .from('messages')
      .insert(messagesToInsert)
      .select('id, phone_number, contact_id');

    if (mErr && mErr.message.includes('message_type')) {
      console.warn('[DB] message_type column missing, falling back to basic insert');
      const fallback = messagesToInsert.map((message) => {
        const copy = { ...message };
        delete copy.message_type;
        return copy;
      });
      const { data: retryData, error: retryErr } = await db
        .from('messages')
        .insert(fallback)
        .select('id, phone_number, contact_id');
      insertedMsgsData = retryData;
      mErr = retryErr;
    }

    const insertedMsgs = insertedMsgsData as InsertedMessageRow[] | null;
    if (mErr || !insertedMsgs) return NextResponse.json({ error: 'Failed to create messages' }, { status: 500 });

    const jobs = insertedMsgs.map((message) => ({
      name: 'send-whatsapp',
      data: {
        messageId: message.id,
        phone: message.phone_number,
        templateId: template.name,
        templateLanguage: template.language || 'en_US',
        params: (contactVars[message.contact_id] || []).map((value) => ({ type: 'text', text: String(value) })),
        isDirectText: false,
      },
    }));

    console.log(`[Queue] Adding ${jobs.length} message jobs to Redis (Bulk Send)...`);
    await messageQueue.addBulk(jobs);
    console.log(`Successfully pushed ${jobs.length} jobs to Redis.`);
    await incrementUsage(tenantId, 'campaigns');

    return NextResponse.json({ success: true, queued: jobs.length });
  } catch (err: unknown) {
    console.error('Message processing error:', err);
    return NextResponse.json({ error: 'Failed to process bulk message request' }, { status: 500 });
  }
}
