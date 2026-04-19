import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token should match what you configured in Meta App Dashboard
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'pingstack-verify-token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          const phoneId = value.metadata?.phone_number_id;

          if (!phoneId) continue;

          // Find tenant for this phone_number_id
          const { data: whatsappAccount } = await db.from('whatsapp_accounts')
            .select('tenant_id')
            .eq('phone_number_id', phoneId)
            .single();

          if (!whatsappAccount) continue;

          const tenantId = whatsappAccount.tenant_id;

          // 1. Status Updates
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              const providerMessageId = status.id;
              const statusType = status.status; // delivered, read, failed
              const error = status.errors && status.errors.length > 0 
                ? `${status.errors[0].title}: ${status.errors[0].message} (Code: ${status.errors[0].code})`
                : null;

              const updateData: any = { status: statusType };
              if (error) updateData.error = error;

              await db.from('messages')
                .update(updateData)
                .eq('provider_message_id', providerMessageId);
            }
          }

          // 2. Incoming Messages
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              const fromPhone = msg.from;
              const msgId = msg.id;
              const msgType = msg.type;

              if (msgType === 'text') {
                const textContext = msg.text.body;

                // NORMALIZE: Meta sends 91..., but we might have stored +91...
                const cleanPhone = fromPhone.replace(/^\+/, '');

                // Find or create contact
                let contactId;
                const { data: existingContact } = await db.from('contacts')
                  .select('id')
                  .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone}`)
                  .eq('tenant_id', tenantId)
                  .maybeSingle();

                if (existingContact) {
                  contactId = existingContact.id;
                } else {
                  const { data: newContact } = await db.from('contacts').insert({
                    tenant_id: tenantId,
                    name: value.contacts?.[0]?.profile?.name || fromPhone,
                    phone_number: fromPhone
                  }).select('id').single();
                  contactId = newContact?.id;
                }

                if (contactId) {
                  // 1. Record the message
                  await db.from('messages').insert({
                    tenant_id: tenantId,
                    contact_id: contactId,
                    phone_number: fromPhone,
                    direction: 'inbound',
                    content: textContext,
                    status: 'received',
                    provider_message_id: msgId
                  });

                  // 2. Update contact's last_received_at to open/refresh the WhatsApp window
                  await db.from('contacts')
                    .update({ last_received_at: new Date().toISOString() })
                    .eq('id', contactId);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Meta Webhook Error:', err);
    return NextResponse.json({ success: true }); // Always return 200 to Meta to prevent retries
  }
}
