import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: true });
    }
    
    if (!body || !body.app) return NextResponse.json({ success: true });
    const { app, type, payload } = body;

    const { data: tenant } = await db.from('tenants').select('id').eq('gupshup_app_name', app).single();
    if (!tenant) {
      console.error(`Received webhook for unknown app: ${app}`);
      return NextResponse.json({ success: true });
    }

    if (type === 'message-event') {
      const { id: providerMessageId, type: statusType } = payload;
      let status = 'sent';
      if (statusType === 'delivered') status = 'delivered';
      if (statusType === 'read') status = 'read';
      if (statusType === 'failed') status = 'failed';

      await db.from('messages')
        .update({ status })
        .eq('provider_message_id', providerMessageId);
        
    } else if (type === 'message') {
      const { source: fromPhone, type: msgType, payload: msgPayload } = payload;
      
      if (msgType === 'text') {
        const textContext = msgPayload.text;

        let contactId;
        const { data: existingContact } = await db.from('contacts')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('phone_number', fromPhone)
          .single();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact } = await db.from('contacts').insert({
            tenant_id: tenant.id,
            name: payload.sender?.name || fromPhone,
            phone_number: fromPhone
          }).select('id').single();
          contactId = newContact?.id;
        }

        if (contactId) {
          await db.from('messages').insert({
            tenant_id: tenant.id,
            contact_id: contactId,
            phone_number: fromPhone,
            direction: 'inbound',
            content: textContext,
            status: 'received',
            provider_message_id: payload.id
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
