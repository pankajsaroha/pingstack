import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageQueue } from '@/lib/queue';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { campaignId, groupIds, contactIds } = await req.json();
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  // 1. Get Campaign and Template
  const { data: campaign, error: cErr } = await db.from('campaigns')
    .select('*, templates(name, language)')
    .eq('id', campaignId)
    .eq('tenant_id', tenantId)
    .single();

  if (cErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  // 2. Gather unique contacts
  let targetContactIds = new Set<string>(contactIds || []);
  if (groupIds && groupIds.length > 0) {
    const { data: gcData } = await db.from('group_contacts').select('contact_id').in('group_id', groupIds).eq('tenant_id', tenantId);
    gcData?.forEach(gc => targetContactIds.add(gc.contact_id));
  }

  const uniqueContactIds = Array.from(targetContactIds);
  if (uniqueContactIds.length === 0) return NextResponse.json({ error: 'No contacts selected' }, { status: 400 });

  // 3. Get contact details
  const { data: contacts, error: contactsErr } = await db.from('contacts').select('*').in('id', uniqueContactIds).eq('tenant_id', tenantId);
  if (contactsErr || !contacts) return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });

  // 4. Create Messages and push to Queue
  const messagesToInsert = contacts.map(c => ({
    tenant_id: tenantId,
    campaign_id: campaignId,
    contact_id: c.id,
    phone_number: c.phone_number,
    status: 'pending',
    direction: 'outbound'
  }));

  const { data: insertedMsgs, error: mErr } = await db.from('messages').insert(messagesToInsert).select('id, phone_number');
  if (mErr || !insertedMsgs) return NextResponse.json({ error: 'Failed to create messages' }, { status: 500 });

  await db.from('campaigns').update({ status: 'running' }).eq('id', campaignId);

  // Push to BullMQ
  const jobs = insertedMsgs.map(m => ({
    name: 'send-whatsapp',
    data: {
      messageId: m.id,
      phone: m.phone_number,
      templateId: (campaign.templates as any).name,
      templateLanguage: (campaign.templates as any).language || 'en_US',
      params: []
    }
  }));
  
  console.log(`[Queue] Adding ${jobs.length} message jobs to Redis for campaign ${campaignId}...`);
  await messageQueue.addBulk(jobs);
  
  // 5. Mark campaign as completed once triggered
  await db.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
  
  console.log(`✅ [Queue] Successfully pushed ${jobs.length} jobs to Redis.`);

  return NextResponse.json({ success: true, queued: jobs.length });
}
