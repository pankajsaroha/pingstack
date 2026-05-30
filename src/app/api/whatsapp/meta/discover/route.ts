import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { getWABAPhoneNumbers } from '@/lib/whatsapp';
import { db } from '@/lib/db';

type GranularScope = {
  scope?: string;
  target_ids?: string[];
};

type WabaSummary = {
  id: string;
  name?: string;
  error?: unknown;
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { code, accessToken: providedToken } = await req.json();
    
    let accessToken = providedToken;

    if (code || providedToken) {
      if (code) {
        const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
        const appSecret = process.env.FB_APP_SECRET;
        if (!appId || !appSecret) {
          return NextResponse.json({
            success: false,
            error: 'META_APP_NOT_CONFIGURED',
            message: 'Meta app credentials are not configured.'
          }, { status: 500 });
        }

        const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (!exchangeData.access_token) {
          return NextResponse.json({ 
            success: false,
            error: 'TOKEN_EXCHANGE_FAILED', 
            message: exchangeData.error?.message || 'Failed to exchange code' 
          }, { status: 400 });
        }

        accessToken = exchangeData.access_token;
      }

      const encryptedToken = encrypt(accessToken);

      const { data: existing } = await db
        .from('whatsapp_accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        await db
          .from('whatsapp_accounts')
          .update({
            access_token: encryptedToken,
            status: 'LINKED',
            provider: 'META',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await db
          .from('whatsapp_accounts')
          .insert({
            tenant_id: tenantId,
            access_token: encryptedToken,
            status: 'LINKED',
            provider: 'META',
            updated_at: new Date().toISOString()
          });
      }
    } else {
      const { data: existing } = await db.from('whatsapp_accounts')
        .select('access_token')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (!existing?.access_token) {
        return NextResponse.json({ success: false, error: 'NO_TOKEN_FOUND' }, { status: 404 });
      }
      accessToken = decrypt(existing.access_token);
    }

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    const granularScopes = (debugData.data?.granular_scopes || []) as GranularScope[];
    const businessId = granularScopes.find((scope) => scope.scope === 'whatsapp_business_management')?.target_ids?.[0];

    const endpoints = [
      `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts`,
      ...(businessId ? [
        `https://graph.facebook.com/v19.0/${businessId}/whatsapp_business_accounts`,
        `https://graph.facebook.com/v19.0/${businessId}/owned_whatsapp_business_accounts`,
        `https://graph.facebook.com/v19.0/${businessId}/client_whatsapp_business_accounts`
      ] : [])
    ];

    const results = await Promise.all(
      endpoints.map(url => fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(r => r.json()))
    );
    
    const allWabaData = results.flatMap((res) => res.data || []) as WabaSummary[];
    const uniqueWabas = Array.from(new Map(allWabaData.map((item) => [item.id, item])).values());
    
    const wabas = [];
    let finalWabas = uniqueWabas;

    if (finalWabas.length === 0 && granularScopes.length > 0) {
      const targetIds = Array.from(new Set(
        granularScopes
          .filter((scope) => scope.scope === 'whatsapp_business_management')
          .flatMap((scope) => scope.target_ids || [])
      ));
      
      if (targetIds.length > 0) {
        const targetWabas = await Promise.all(targetIds.map(id => 
          fetch(`https://graph.facebook.com/v19.0/${id}?fields=name,id`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }).then(r => r.json())
        ));
        finalWabas = (targetWabas as WabaSummary[]).filter((waba) => waba.id && !waba.error);
      }
    }

    for (const waba of finalWabas) {
      const phoneData = await getWABAPhoneNumbers(waba.id, accessToken);
      wabas.push({
        id: waba.id,
        name: waba.name || 'WhatsApp Business Account',
        phones: phoneData.data || []
      });
    }

    return NextResponse.json({ 
      success: true, 
      wabas, 
      discovery: wabas,
      accessToken, 
      portfolioId: businessId 
    });

  } catch (err: unknown) {
    console.error('Discovery Error:', err);
    const message = err instanceof Error ? err.message : 'Discovery failed';
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}
