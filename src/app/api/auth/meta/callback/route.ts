import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { getWABADetails, getWABAPhoneNumbers, subscribeWABAWebhooks } from '@/lib/whatsapp';

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

  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;

  try {
    // 1. Exchange code for access_token
    // For Embedded Signup 'code', we use the standard OAuth exchange
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
    
    const res = await fetch(exchangeUrl);
    const data = await res.json();

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

    // 5. Store the token and discovered assets
    const { error: dbError } = await db.from('whatsapp_accounts').upsert({
      tenant_id: state,
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneNumberId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' });

    if (dbError) throw dbError;

    return NextResponse.redirect(`${origin}/dashboard?meta_success=linked&business=${encodeURIComponent(waba.name)}`);

  } catch (err: any) {
    console.error('Meta Callback Error:', err);
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent(err.message)}`);
  }
}
