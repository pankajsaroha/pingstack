import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { ensureFreshLimits } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    console.error('[tenant/me] Missing x-tenant-id header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    console.error('[tenant/me] Database client is not initialized');
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  try {
    const { data: tenantData, error: tError } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (tError) {
      console.error('[tenant/me] tenant query failed', { tenantId, error: tError });
      return NextResponse.json({ error: 'Tenant lookup failed', details: tError.message }, { status: 500 });
    }

    const tenant = await ensureFreshLimits(tenantId, tenantData);

    const { data: whatsappAccount, error: wError } = await db.from('whatsapp_accounts')
      .select('id, provider, status, phone_number_id, business_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (wError) {
      console.error('[tenant/me] whatsapp account query failed', { tenantId, error: wError });
      return NextResponse.json({ error: 'WhatsApp account lookup failed', details: wError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...tenant,
      whatsapp_account: whatsappAccount || null
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tenant/me] unexpected error', { tenantId, error: message, raw: err });
    return NextResponse.json({ error: 'Unexpected server error', details: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { timezone } = body;

    const { data, error } = await db.from('tenants')
      .update({ timezone })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tenant/me PATCH] unexpected error', { tenantId, error: message, raw: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
