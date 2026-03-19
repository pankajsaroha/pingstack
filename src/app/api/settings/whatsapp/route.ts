import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  return NextResponse.json({ success: true });
}
