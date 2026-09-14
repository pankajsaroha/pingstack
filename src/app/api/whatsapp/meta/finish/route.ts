import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { subscribeWABAWebhooks, registerMetaPhoneNumber } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { accessToken, wabaId, phoneId, portfolioId } = await req.json();

    let tokenToUse = accessToken;
    if (!tokenToUse) {
      const { data: existing } = await db
        .from('whatsapp_accounts')
        .select('access_token')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing?.access_token) {
        const { decrypt } = await import('@/lib/encryption');
        tokenToUse = decrypt(existing.access_token);
      }
    }

    if (!tokenToUse || !wabaId || !phoneId) {
      return NextResponse.json({ error: 'Missing configuration details (token, WABA ID, or Phone ID required)' }, { status: 400 });
    }

    // 1. Subscribe WABA to Webhooks & Register Phone Number concurrently
    const [subRes, regRes] = await Promise.allSettled([
      subscribeWABAWebhooks(wabaId, tokenToUse),
      registerMetaPhoneNumber(phoneId, tokenToUse)
    ]);

    if (subRes.status === 'fulfilled' && !subRes.value.success && subRes.value.error) {
      console.warn('Webhook subscription warning:', subRes.value.error);
    }
    if (regRes.status === 'rejected') {
      console.warn('Phone registration warning:', regRes.reason);
    }

    const encryptedToken = encrypt(tokenToUse);

    // 2. Prepare Consolidated Payload
    const accountPayload: Record<string, any> = {
      tenant_id: tenantId,
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    };

    if (portfolioId) {
      accountPayload.portfolio_id = portfolioId;
    }

    // 3. Store in Database in a single atomic upsert
    const { error: dbError } = await db
      .from('whatsapp_accounts')
      .upsert(accountPayload, { onConflict: 'tenant_id' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Finalization Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
