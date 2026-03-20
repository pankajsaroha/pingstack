import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Meta OAuth Error:', error);
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?meta_error=no_code`);
  }

  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;

  try {
    // 1. Exchange code for access_token
    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${origin}/api/auth/meta/callback&client_secret=${appSecret}&code=${code}`;
    const res = await fetch(exchangeUrl);
    const data = await res.json();

    if (!data.access_token) {
      throw new Error(data.error?.message || 'Failed to exchange code');
    }

    const accessToken = data.access_token;

    // 2. We need the tenantId.
    // Since this is a redirect, we can't easily get the tenantId from headers.
    // We should have passed 'state' with tenantId or stored it in a cookie.
    // For simplicity, we'll assume the user is logged in and we can get their session?
    // Actually, Next.js Middleware/Auth should handle session.
    // BUT we need to know WHICH tenant to update.
    
    // Suggestion: The Step 1 button should pass `state={tenantId}` in the OAuth URL.
    const state = searchParams.get('state');
    if (!state) {
        throw new Error('Missing state parameter (tenantId)');
    }
    const tenantId = state;

    const encryptedToken = encrypt(accessToken);

    // 3. Store the token
    await db.from('whatsapp_accounts').upsert({
      tenant_id: tenantId,
      provider: 'META',
      access_token: encryptedToken,
      status: 'PENDING_SETUP',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' });

    return NextResponse.redirect(`${origin}/dashboard?meta_success=linked`);

  } catch (err: any) {
    console.error('Meta Callback Error:', err);
    return NextResponse.redirect(`${origin}/dashboard?meta_error=${encodeURIComponent(err.message)}`);
  }
}
