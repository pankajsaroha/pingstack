import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code, accessToken, reDiscover } = await req.json();
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'Meta App credentials not configured' }, { status: 500 });
    }

    let tokenToUse = accessToken;

    // 1. If re-discovering, fetch existing token from DB
    if (reDiscover) {
      const { data: existing } = await db.from('whatsapp_accounts')
        .select('access_token')
        .eq('tenant_id', tenantId)
        .single();
      
      if (!existing?.access_token) {
        return NextResponse.json({ error: 'NO_TOKEN_STORED', message: 'No existing connection found.' }, { status: 400 });
      }
      tokenToUse = decrypt(existing.access_token);
      console.log('Re-using stored token for discovery...');
    } else {
      // 2. Exchange for long-lived token if new token/code provided
      console.log('Exchanging/Refreshing Meta token...');
      const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken || code}`;
      const exchangeRes = await fetch(exchangeUrl);
      const exchangeData = await exchangeRes.json();

      if (exchangeData.access_token) {
        tokenToUse = exchangeData.access_token;
        console.log('Long-lived token acquired');
      }
    }

    const encryptedToken = encrypt(tokenToUse);

    // 3. Discover WABAs
    console.log('Discovering WhatsApp Business Accounts...');
    const wabaRes = await fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${tokenToUse}`);
    const wabaData = await wabaRes.json();

    if (!wabaData.data || wabaData.data.length === 0) {
      // Save token even if discovery fails
      await db.from('whatsapp_accounts').upsert({
        tenant_id: tenantId,
        provider: 'META',
        access_token: encryptedToken,
        status: 'PENDING_SETUP',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });

      return NextResponse.json({ 
        error: 'NO_WABA_FOUND', 
        message: 'No WhatsApp Business Accounts found.' 
      }, { status: 404 });
    }

    // 4. Discover Phone Numbers (Check first WABA)
    const waba = wabaData.data[0];
    const wabaId = waba.id;
    console.log(`Found WABA: ${wabaId}. Discovering phone numbers...`);

    const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${tokenToUse}`);
    const phoneData = await phoneRes.json();

    if (!phoneData.data || phoneData.data.length === 0) {
      // Save token + WABA ID even if phone discovery fails
      await db.from('whatsapp_accounts').upsert({
        tenant_id: tenantId,
        provider: 'META',
        business_id: wabaId,
        access_token: encryptedToken,
        status: 'PENDING_SETUP',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });

      return NextResponse.json({ 
        error: 'NO_PHONE_FOUND', 
        message: 'No phone numbers found in your WhatsApp Business Account.',
        wabaId
      }, { status: 404 });
    }

    // 5. Pickup first phone number
    const phone = phoneData.data[0];
    const phoneNumberId = phone.id;
    const displayPhone = phone.display_phone_number;

    console.log(`Discovered Phone ID: ${phoneNumberId} (${displayPhone})`);

    // 6. Final activation
    const { error: dbError } = await db.from('whatsapp_accounts').upsert({
      tenant_id: tenantId,
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneNumberId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'FAILED_TO_SAVE', message: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      wabaId, 
      phoneNumberId, 
      displayPhone 
    });

  } catch (err: any) {
    console.error('Meta Exchange Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
