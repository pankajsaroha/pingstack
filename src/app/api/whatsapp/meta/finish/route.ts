import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { subscribeWABAWebhooks } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { accessToken, wabaId, phoneId } = await req.json();
    if (!accessToken || !wabaId || !phoneId) {
      return NextResponse.json({ error: 'Missing configuration details' }, { status: 400 });
    }

    // 1. Subscribe WABA to Webhooks
    const subRes = await subscribeWABAWebhooks(wabaId, accessToken);
    if (!subRes.success && subRes.error) {
       // We log but don't strictly fail unless it's a critical error
       console.warn('Webhook subscription warning:', subRes.error);
    }

    const encryptedToken = encrypt(accessToken);

    // 2. Store in Database
    const { error: dbError } = await db.from('whatsapp_accounts').upsert({
      tenant_id: tenantId,
      provider: 'META',
      business_id: wabaId,
      phone_number_id: phoneId,
      access_token: encryptedToken,
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Finalization Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
