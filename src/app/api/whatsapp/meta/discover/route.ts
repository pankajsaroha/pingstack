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
    let businessIds: string[] = [];

    if (appId && appSecret) {
      try {
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
        const debugRes = await fetch(debugUrl);
        const debugData = await debugRes.json();
        const granularScopes = (debugData.data?.granular_scopes || []) as GranularScope[];
        businessIds = Array.from(new Set(
          granularScopes
            .filter((scope) => scope.scope === 'whatsapp_business_management')
            .flatMap((scope) => scope.target_ids || [])
        ));
      } catch (debugErr) {
        console.warn('Debug token scope parsing warning:', debugErr);
      }
    }

    // 1. Fetch user's direct WABAs & Business Portfolios in parallel
    const [meWabasRes, meBusinessesRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id,name`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name},client_whatsapp_business_accounts{id,name}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(r => r.json()).catch(() => ({ data: [] }))
    ]);

    const collectedWabas: WabaSummary[] = [...(meWabasRes.data || [])];

    // Extract WABAs from business portfolios
    if (meBusinessesRes.data) {
      for (const biz of meBusinessesRes.data) {
        if (biz.id && !businessIds.includes(biz.id)) businessIds.push(biz.id);
        if (biz.owned_whatsapp_business_accounts?.data) {
          collectedWabas.push(...biz.owned_whatsapp_business_accounts.data);
        }
        if (biz.client_whatsapp_business_accounts?.data) {
          collectedWabas.push(...biz.client_whatsapp_business_accounts.data);
        }
      }
    }

    // Query specific endpoints for all discovered business IDs
    if (businessIds.length > 0) {
      const bizEndpoints = businessIds.flatMap(bizId => [
        `https://graph.facebook.com/v19.0/${bizId}?fields=id,name`,
        `https://graph.facebook.com/v19.0/${bizId}/whatsapp_business_accounts?fields=id,name`,
        `https://graph.facebook.com/v19.0/${bizId}/owned_whatsapp_business_accounts?fields=id,name`,
        `https://graph.facebook.com/v19.0/${bizId}/client_whatsapp_business_accounts?fields=id,name`
      ]);

      const bizResults = await Promise.all(
        bizEndpoints.map(url => fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).then(r => r.json()).catch(() => ({})))
      );

      for (const res of bizResults) {
        if (res.id && res.name) collectedWabas.push(res);
        if (Array.isArray(res.data)) collectedWabas.push(...res.data);
      }
    }

    // Deduplicate WABAs by ID
    const uniqueWabas = Array.from(new Map(collectedWabas.filter(w => w.id && !w.error).map(w => [w.id, w])).values());

    const wabas = [];
    for (const waba of uniqueWabas) {
      const phoneData = await getWABAPhoneNumbers(waba.id, accessToken);
      wabas.push({
        id: waba.id,
        name: waba.name || `WABA ${waba.id}`,
        phones: phoneData.data || []
      });
    }

    return NextResponse.json({ 
      success: true, 
      wabas, 
      discovery: wabas,
      accessToken, 
      portfolioId: businessIds[0] || '' 
    });

  } catch (err: unknown) {
    console.error('Discovery Error:', err);
    const message = err instanceof Error ? err.message : 'Discovery failed';
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message }, { status: 500 });
  }
}
