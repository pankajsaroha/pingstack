import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { ensureFreshLimits } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get tenant info
  const { data: tenantData, error: tError } = await db.from('tenants').select('*').eq('id', tenantId).single();
  if (tError) return NextResponse.json({ error: tError.message }, { status: 500 });
  
  // Ensure limits are fresh (Proactive Reset)
  const tenant = await ensureFreshLimits(tenantId, tenantData);

  // Get WhatsApp account info
  const { data: whatsappAccount, error: wError } = await db.from('whatsapp_accounts')
    .select('id, provider, status, phone_number_id, business_id')
    .eq('tenant_id', tenantId)
    .single();

  return NextResponse.json({
    ...tenant,
    whatsapp_account: whatsappAccount || null
  });
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
