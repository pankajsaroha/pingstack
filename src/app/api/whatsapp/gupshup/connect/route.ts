import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { apiKey, appName, phoneNumber } = await req.json();

    if (!apiKey || !appName || !phoneNumber) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    const { error } = await db.from('whatsapp_accounts').upsert({
      tenant_id: tenantId,
      provider: 'GUPSHUP',
      gupshup_app_name: appName,
      gupshup_api_key: encryptedKey,
      phone_number_id: phoneNumber, // repurposed for Gupshup phone number
      status: 'ACTIVE',
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id' }); // Assuming one WhatsApp account per tenant for now

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
