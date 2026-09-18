import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { getWABADetails, getWABAPhoneNumbers, subscribeWABAWebhooks } from '@/lib/whatsapp';
import { fetchWithMetaRetry } from '@/lib/server/meta-retry';
import { recordLatency } from '@/lib/server/latency-telemetry';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // tenantId

  if (error) {
    console.error('Meta OAuth Error:', error);
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=missing_params`);
  }
  if (!db) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent('database_unavailable')}`);
  }

  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent('meta_app_not_configured')}`);
  }

  const startTime = performance.now();

  try {
    // 1. Exchange code for access_token with retries
    const exchangeStart = performance.now();
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
    const res = await fetchWithMetaRetry(exchangeUrl, {}, { operationName: 'oauth_callback_token_exchange' });
    const data = await res.json();
    recordLatency('WHATSAPP_ONBOARDING', 'token_exchange', 'external_api_latency', performance.now() - exchangeStart, !data.access_token);

    if (!data.access_token) {
      throw new Error(data.error?.message || 'Failed to exchange code');
    }

    const accessToken = data.access_token;
    const encryptedToken = encrypt(accessToken);

    // 2. Discover WABA Details
    const wabaData = await getWABADetails(accessToken);
    if (!wabaData.data || wabaData.data.length === 0) {
      throw new Error('NO_WABA_FOUND: No WhatsApp Business Accounts found.');
    }

    const waba = wabaData.data[0];
    const wabaId = waba.id;

    // 3. Discover Phone Numbers
    const phoneData = await getWABAPhoneNumbers(wabaId, accessToken);
    if (!phoneData.data || phoneData.data.length === 0) {
      throw new Error('NO_PHONE_FOUND: No phone numbers found in your WABA.');
    }

    const phone = phoneData.data[0];
    const phoneNumberId = phone.id;

    // 4. Subscribe WABA to Webhooks
    const subRes = await subscribeWABAWebhooks(wabaId, accessToken);
    if (!subRes.success) {
      console.warn('Webhook subscription might have failed:', subRes);
    }

    // 5. Store the token and discovered assets safely without relying on non-existent ON CONFLICT constraint
    const { data: existingAccount } = await db
      .from('whatsapp_accounts')
      .select('id')
      .eq('tenant_id', state)
      .maybeSingle();

    let dbError;
    if (existingAccount) {
      const { error } = await db
        .from('whatsapp_accounts')
        .update({
          provider: 'META',
          business_id: wabaId,
          phone_number_id: phoneNumberId,
          access_token: encryptedToken,
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
      dbError = error;
    } else {
      const { error } = await db
        .from('whatsapp_accounts')
        .insert({
          tenant_id: state,
          provider: 'META',
          business_id: wabaId,
          phone_number_id: phoneNumberId,
          access_token: encryptedToken,
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        });
      dbError = error;
    }

    if (dbError) throw dbError;

    await invalidateTenantCache(state);

    // 6. Asynchronous non-blocking background template & limits sync
    setTimeout(() => {
      fetch(`${origin}/api/whatsapp/meta/templates`, {
        headers: { 'x-tenant-id': state }
      }).catch(err => console.warn('[Callback Background Template Sync] Warning:', err));

      fetch(`${origin}/api/whatsapp/meta/limits`, {
        method: 'POST',
        headers: { 'x-tenant-id': state }
      }).catch(err => console.warn('[Callback Background Limits Sync] Warning:', err));
    }, 50);

    recordLatency('WHATSAPP_ONBOARDING', 'callback', 'request_latency', performance.now() - startTime, false);

    return NextResponse.redirect(`${origin}/dashboard?meta_success=linked&business=${encodeURIComponent(waba.name)}`);

  } catch (err: unknown) {
    console.error('Meta Callback Error:', err);
    recordLatency('WHATSAPP_ONBOARDING', 'callback', 'request_latency', performance.now() - startTime, true);
    const message = err instanceof Error ? err.message : 'Meta callback failed';
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent(message)}`);
  }
}
