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
    if (!db) return NextResponse.json({ success: true });
    const body = await req.json();

    if (body.object === 'whatsapp_business_account') {
      const accountCache = new Map<string, string | null>();

      const entryPromises = (body.entry || []).map(async (entry: any) => {
        const changePromises = (entry.changes || []).map(async (change: any) => {
          const value = change.value;
          const phoneId = value.metadata?.phone_number_id;

          if (!phoneId) return;

          // Lookup tenantId (using request-level in-memory cache to eliminate duplicate DB queries)
          let tenantId: string | null | undefined = accountCache.get(phoneId);
          if (tenantId === undefined) {
            const { data: whatsappAccount } = await db!
              .from('whatsapp_accounts')
              .select('tenant_id')
              .eq('phone_number_id', phoneId)
              .maybeSingle();
            tenantId = whatsappAccount?.tenant_id || null;
            accountCache.set(phoneId, tenantId || null);
          }

          if (!tenantId) return;

          // 1. Process Status Updates in Parallel
          const statusPromises = (value.statuses || []).map(async (status: any) => {
            const providerMessageId = status.id;
            const statusType = status.status; // delivered, read, failed
            const error = status.errors && status.errors.length > 0 
              ? (status.errors[0].title === status.errors[0].message 
                  ? `${status.errors[0].message} (Code: ${status.errors[0].code})`
                  : `${status.errors[0].title}: ${status.errors[0].message} (Code: ${status.errors[0].code})`)
              : null;

            const updateData: any = { status: statusType };
            if (error) updateData.error = error;

            return db!
              .from('messages')
              .update(updateData)
              .eq('provider_message_id', providerMessageId);
          });

          // 2. Process Incoming Messages in Parallel
          const messagePromises = (value.messages || []).map(async (msg: any) => {
            if (msg.type === 'text') {
              const fromPhone = msg.from;
              const msgId = msg.id;
              const textContext = msg.text.body;

              // NORMALIZE: Meta sends 91..., but we might have stored +91...
              const cleanPhone = fromPhone.replace(/^\+/, '');

              // Find or create contact
              let contactId: string | undefined;
              const { data: existingContact } = await db!
                .from('contacts')
                .select('id')
                .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone}`)
                .eq('tenant_id', tenantId)
                .maybeSingle();

              if (existingContact) {
                contactId = existingContact.id;
              } else {
                const { data: newContact } = await db!
                  .from('contacts')
                  .insert({
                    tenant_id: tenantId,
                    name: value.contacts?.[0]?.profile?.name || fromPhone,
                    phone_number: fromPhone
                  })
                  .select('id')
                  .single();
                contactId = newContact?.id;
              }

              if (contactId) {
                await Promise.all([
                  db!.from('messages').insert({
                    tenant_id: tenantId,
                    contact_id: contactId,
                    phone_number: fromPhone,
                    direction: 'inbound',
                    content: textContext,
                    status: 'received',
                    provider_message_id: msgId
                  }),
                  db!.from('contacts')
                    .update({ last_received_at: new Date().toISOString() })
                    .eq('id', contactId)
                ]);
              }
            }
          });

          await Promise.all([...statusPromises, ...messagePromises]);
        });

        await Promise.all(changePromises);
      });

      await Promise.all(entryPromises);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Meta Webhook Error:', err);
    return NextResponse.json({ success: true }); // Always return 200 to Meta to prevent webhook retries
  }
}
