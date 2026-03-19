import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    console.log('--- Meta Token Exchange Start ---');
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('Missing FB_APP_ID or FB_APP_SECRET');
      return NextResponse.json({ error: 'Server configuration error (Meta keys missing)' }, { status: 500 });
    }

    // 1. Exchange code for access token
    console.log('Step 1: Exchanging code for access token...');
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenData.error);
      return NextResponse.json({ error: tokenData.error?.message || 'Failed to exchange token' }, { status: 500 });
    }

    const accessToken = tokenData.access_token;
    console.log('Token received successfully.');

    // 2. Fetch Debug Token 
    console.log('Step 2: verifying token via debug_token...');
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
    );
    const debugData = await debugRes.json();

    if (!debugRes.ok || !debugData.data) {
      console.error('Debug token failed:', debugData.error);
      return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
    }

    // 3. Fetch WABA
    console.log('Step 3: Fetching WhatsApp Business Accounts...');
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();
    
    if (!wabaRes.ok || !wabaData.data || wabaData.data.length === 0) {
      console.error('No WABA found or fetch failed:', wabaData.error || 'Empty');
      return NextResponse.json({ error: 'No WhatsApp Business Account found' }, { status: 404 });
    }

    const businessId = wabaData.data[0].id;
    console.log(`WABA found: ${businessId}`);

    // 4. Fetch Phone Number ID
    console.log('Step 4: Fetching Phone Numbers...');
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${businessId}/phone_numbers?access_token=${accessToken}`
    );
    const phoneData = await phoneRes.json();

    if (!phoneRes.ok || !phoneData.data || phoneData.data.length === 0) {
      console.error('No phone number found or fetch failed:', phoneData.error || 'Empty');
      return NextResponse.json({ error: 'No phone number found' }, { status: 404 });
    }

    const phoneNumberId = phoneData.data[0].id;
    console.log(`Phone ID found: ${phoneNumberId}`);

    // 5. Encrypt and store
    console.log('Step 5: Encrypting and saving to DB...');
    const encryptedToken = encrypt(accessToken);

    const { error: upsertError } = await db.from('whatsapp_accounts').upsert({
      tenant_id: tenantId,
      provider: 'META',
      business_id: businessId,
      phone_number_id: phoneNumberId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    }, { onConflict: 'phone_number_id' });

    if (upsertError) {
      console.error('DB Upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    console.log('--- Meta Token Exchange Success ---');
    return NextResponse.json({ success: true, phoneNumberId });
  } catch (err: any) {
    console.error('Token exchange error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
