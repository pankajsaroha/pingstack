import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { getWABADetails, getWABAPhoneNumbers } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();
    const { encrypt, decrypt } = await import('@/lib/encryption');
    const { db } = await import('@/lib/db');
    
    let accessToken: string;

    if (code) {
      const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
      const appSecret = process.env.FB_APP_SECRET;

      // 1. Exchange code for access_token
      const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
      const exchangeRes = await fetch(exchangeUrl);
      const exchangeData = await exchangeRes.json();

      if (!exchangeData.access_token) {
        return NextResponse.json({ 
          error: 'TOKEN_EXCHANGE_FAILED', 
          message: exchangeData.error?.message || 'Failed to exchange code' 
        }, { status: 400 });
      }

      accessToken = exchangeData.access_token;
      const encryptedToken = encrypt(accessToken);

      // 2. Persist the connection state
      await db.from('whatsapp_accounts').upsert({
        tenant_id: tenantId,
        access_token: encryptedToken,
        status: 'LINKED',
        provider: 'META'
      });
    } else {
      // Look for stored token
      const { data: existing } = await db.from('whatsapp_accounts')
        .select('access_token')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (!existing?.access_token) {
        return NextResponse.json({ error: 'NO_TOKEN_FOUND', message: 'No linked account found' }, { status: 404 });
      }
      accessToken = decrypt(existing.access_token);
    }

    // 3. Discover WABA Details
    console.log(`[Meta] Fetching WABAs for token...`);
    const wabaData = await getWABADetails(accessToken);
    console.log(`[Meta] WABA Response:`, JSON.stringify(wabaData));
    
    const discovery = [];

    if (wabaData.data) {
      for (const waba of wabaData.data) {
        console.log(`[Meta] Fetching phones for WABA: ${waba.id}`);
        const phoneData = await getWABAPhoneNumbers(waba.id, accessToken);
        console.log(`[Meta] Phone Response for ${waba.id}:`, JSON.stringify(phoneData));
        
        discovery.push({
          id: waba.id,
          name: waba.name,
          phones: phoneData.data || []
        });
      }
    } else {
      console.warn(`[Meta] No WABA data found in response:`, wabaData);
    }

    return NextResponse.json({ 
      success: true, 
      accessToken, // Return raw token to UI for the next "finish" call
      wabas: discovery 
    });

  } catch (err: any) {
    console.error('Discovery Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
