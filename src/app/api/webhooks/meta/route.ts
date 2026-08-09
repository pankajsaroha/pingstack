import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

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

/**
 * Verify Meta's X-Hub-Signature-256 header.
 * Meta signs the raw request body with FB_APP_SECRET using HMAC-SHA256
 * and sends it as "sha256=<hex>".
 * Uses timingSafeEqual to prevent timing-based signature extraction.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.FB_APP_SECRET;
  if (!appSecret) {
    console.error('[webhook/meta] FB_APP_SECRET is not configured — cannot verify signature');
    return false;
  }
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const receivedSig = signatureHeader.slice('sha256='.length);

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(receivedSig, 'hex')
    );
  } catch {
    return false; // Different lengths → definitely invalid
  }
}

export async function POST(req: Request) {
  try {
    if (!db) return NextResponse.json({ success: true });

    // Read raw body BEFORE json() so we can verify the HMAC signature
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-hub-signature-256');

    if (!verifyMetaSignature(rawBody, signatureHeader)) {
      console.error('[webhook/meta] Signature verification failed — request rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

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
