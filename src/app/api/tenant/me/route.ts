import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get tenant info
  const { data: tenant, error: tError } = await db.from('tenants').select('*').eq('id', tenantId).single();
  if (tError) return NextResponse.json({ error: tError.message }, { status: 500 });
  
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
