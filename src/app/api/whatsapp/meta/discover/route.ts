import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { getWABADetails, getWABAPhoneNumbers } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;

    // 1. Exchange code for access_token
    // Use authorization_code flow for the client-side code
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();

    if (!exchangeData.access_token) {
      return NextResponse.json({ 
        error: 'TOKEN_EXCHANGE_FAILED', 
        message: exchangeData.error?.message || 'Failed to exchange code' 
      }, { status: 400 });
    }

    const accessToken = exchangeData.access_token;

    // 2. Discover WABA Details
    const wabaData = await getWABADetails(accessToken);
    const discovery = [];

    if (wabaData.data) {
      for (const waba of wabaData.data) {
        const phoneData = await getWABAPhoneNumbers(waba.id, accessToken);
        discovery.push({
          id: waba.id,
          name: waba.name,
          phones: phoneData.data || []
        });
      }
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
