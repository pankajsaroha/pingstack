import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { subscribeWABAWebhooks } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { accessToken, wabaId, phoneId, portfolioId } = await req.json();
    if (!accessToken || !wabaId || !phoneId) {
      return NextResponse.json({ error: 'Missing configuration details' }, { status: 400 });
    }

    // 1. Subscribe WABA to Webhooks
    const subRes = await subscribeWABAWebhooks(wabaId, accessToken);
    if (!subRes.success && subRes.error) {
       console.warn('Webhook subscription warning:', subRes.error);
    }

    const encryptedToken = encrypt(accessToken);

    // 2. Prepare Base Payload (without portfolio_id)
    const basePayload = {
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    };

    // 3. Store in Database
    const { data: existing } = await db
      .from('whatsapp_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existing) {
      const { error: mainError } = await db
        .from('whatsapp_accounts')
        .update(basePayload)
        .eq('id', existing.id);
      
      if (mainError) throw mainError;

      // Optional: Try to update portfolio_id separately
      if (portfolioId) {
        await db
          .from('whatsapp_accounts')
          .update({ portfolio_id: portfolioId })
          .eq('id', existing.id);
      }
    } else {
      const { error: mainError } = await db
        .from('whatsapp_accounts')
        .insert({ ...basePayload, tenant_id: tenantId });
      
      if (mainError) throw mainError;

      // Optional: Try to update portfolio_id separately
      if (portfolioId) {
        await db
          .from('whatsapp_accounts')
          .update({ portfolio_id: portfolioId })
          .eq('tenant_id', tenantId);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Finalization Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
