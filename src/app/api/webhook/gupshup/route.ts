import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enqueueInboundMessagePushNotification } from '@/lib/server/push-notifications';

export async function POST(req: Request) {
  try {
    if (!db) return NextResponse.json({ success: true });
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

        const cleanPhone = fromPhone.replace(/^\+/, '');
        const cleanPhoneDigits = fromPhone.replace(/\D/g, '');

        let contactId: string | null = null;
        const { data: existingContact } = await db.from('contacts')
          .select('id, name')
          .eq('tenant_id', tenant.id)
          .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone},phone_number.eq.${cleanPhoneDigits}`)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        }

        await db.from('messages').insert({
          tenant_id: tenant.id,
          contact_id: contactId || null,
          phone_number: fromPhone,
          direction: 'inbound',
          content: textContext,
          status: 'received',
          provider_message_id: payload.id
        });

        if (contactId) {
          await db.from('contacts')
            .update({ last_received_at: new Date().toISOString() })
            .eq('id', contactId);
        }

        await enqueueInboundMessagePushNotification({
          tenantId: tenant.id,
          contactId: contactId || undefined,
          messageId: payload.id,
          senderName: payload.sender?.name || existingContact?.name || fromPhone,
          senderPhone: fromPhone,
          messageText: textContext,
        }).catch((err) => console.error('[Gupshup Webhook Push Enqueue Error]:', err));
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
