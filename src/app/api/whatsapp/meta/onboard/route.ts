import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { getWABADetails, getWABAPhoneNumbers, subscribeWABAWebhooks } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'Meta App credentials not configured' }, { status: 500 });
    }

    // 1. Exchange code for access_token
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${code}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();

    if (!exchangeData.access_token) {
      return NextResponse.json({ 
        error: 'TOKEN_EXCHANGE_FAILED', 
        message: exchangeData.error?.message || 'Failed to exchange code' 
      }, { status: 400 });
    }

    const accessToken = exchangeData.access_token;
    const encryptedToken = encrypt(accessToken);

    // 2. Discover WABA Details
    const wabaData = await getWABADetails(accessToken);
    if (!wabaData.data || wabaData.data.length === 0) {
      return NextResponse.json({ error: 'NO_WABA_FOUND', message: 'No WhatsApp Business Accounts found.' }, { status: 404 });
    }

    const waba = wabaData.data[0];
    const wabaId = waba.id;
    const businessName = waba.name;

    // 3. Discover Phone Numbers
    const phoneData = await getWABAPhoneNumbers(wabaId, accessToken);
    if (!phoneData.data || phoneData.data.length === 0) {
      return NextResponse.json({ error: 'NO_PHONE_FOUND', message: 'No phone numbers found in your WABA.', wabaId }, { status: 404 });
    }

    const phone = phoneData.data[0];
    const phoneNumberId = phone.id;

    // 4. Subscribe WABA to Webhooks
    const subRes = await subscribeWABAWebhooks(wabaId, accessToken);
    if (!subRes.success) {
      console.warn('Webhook subscription might have failed:', subRes);
    }

    // 5. Store in Database
    const { error: dbError } = await db.from('whatsapp_accounts').upsert({
      tenant_id: tenantId,
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneNumberId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' });

    if (dbError) throw dbError;

    return NextResponse.json({ 
      success: true, 
      wabaId, 
      phoneNumberId, 
      businessName 
    });

  } catch (err: any) {
    console.error('Onboarding Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
