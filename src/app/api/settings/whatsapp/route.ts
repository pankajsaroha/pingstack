import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { appName, apiKey, whatsappNumber } = await req.json();
  if (!appName || !apiKey || !whatsappNumber) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { error } = await db.from('tenants')
    .update({ 
      gupshup_app_name: appName, 
      gupshup_api_key: apiKey, 
      whatsapp_number: whatsappNumber,
      whatsapp_status: 'connected'
    })
    .eq('id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await invalidateTenantCache(tenantId);
  return NextResponse.json({ success: true });
}
