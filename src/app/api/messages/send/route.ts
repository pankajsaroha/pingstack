import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';
import { checkLimit, incrementUsage } from '@/lib/limits';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { contactIds, template_id } = await req.json();
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0 || !template_id) {
      return NextResponse.json({ error: 'Invalid payload. contactIds (array) and template_id are required.' }, { status: 400 });
    }

    const canSendCampaign = await checkLimit(tenantId, 'campaigns');
    if (!canSendCampaign) {
      return NextResponse.json({ error: 'Upgrade to continue. You have reached your daily campaigns limit.' }, { status: 403 });
    }

  const { data: contacts, error: cErr } = await db.from('contacts')
    .select('*').in('id', contactIds).eq('tenant_id', tenantId);
    
  if (cErr || !contacts) return NextResponse.json({ error: 'Database error' }, { status: 500 });
  if (contacts.length === 0) return NextResponse.json({ error: 'No valid contacts found' }, { status: 404 });

  const { data: template, error: tErr } = await db.from('templates')
    .select('*').eq('id', template_id).eq('tenant_id', tenantId).single();

  if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const messagesToInsert = contacts.map(c => ({
    tenant_id: tenantId,
    contact_id: c.id,
    phone_number: c.phone_number,
    status: 'pending'
  }));

  const { data: insertedMsgs, error: mErr } = await db.from('messages').insert(messagesToInsert).select('id, phone_number');
  if (mErr || !insertedMsgs) return NextResponse.json({ error: 'Failed to create messages' }, { status: 500 });

  const jobs = insertedMsgs.map(m => ({
    name: 'send-whatsapp',
    data: {
      messageId: m.id,
      phone: m.phone_number,
      templateId: template.template_id,
      templateLanguage: 'en_US',
      params: [],
      isDirectText: false
    }
  }));

  await messageQueue.addBulk(jobs);
  await incrementUsage(tenantId, 'campaigns');

  return NextResponse.json({ success: true, queued: jobs.length });
  } catch (err: any) {
    console.error('Message processing error:', err);
    return NextResponse.json({ error: 'Failed to process bulk message request' }, { status: 500 });
  }
}
