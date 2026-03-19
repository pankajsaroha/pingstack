import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    // 1. Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json({ error: tokenData.error?.message || 'Failed to exchange token' }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch Debug Token to get Business ID and metadata (simplified for MVP)
    // In a real production flow, we'd iterate through managed businesses/phone numbers.
    // For this implementation, we assume the user picks one or we take the first available from the debug response.
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
    );
    const debugData = await debugRes.json();

    if (!debugRes.ok || !debugData.data) {
      return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
    }

    // Note: Meta Embedded Signup returns specific granular data. 
    // Usually, we'd call /me/accounts or /me/whatsapp_business_accounts.
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();
    
    if (!wabaRes.ok || !wabaData.data || wabaData.data.length === 0) {
      return NextResponse.json({ error: 'No WhatsApp Business Account found' }, { status: 404 });
    }

    const businessId = wabaData.data[0].id;

    // 3. Fetch Phone Number ID for that WABA
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${businessId}/phone_numbers?access_token=${accessToken}`
    );
    const phoneData = await phoneRes.json();

    if (!phoneRes.ok || !phoneData.data || phoneData.data.length === 0) {
      return NextResponse.json({ error: 'No phone number found' }, { status: 404 });
    }

    const phoneNumberId = phoneData.data[0].id;

    // 4. Encrypt and store
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
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, phoneNumberId });
  } catch (err: any) {
    console.error('Token exchange error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
