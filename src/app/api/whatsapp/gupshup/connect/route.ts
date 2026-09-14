import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { apiKey, appName, phoneNumber } = await req.json();

    if (!apiKey || !appName || !phoneNumber) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);

    const { data: existingAccount } = await db
      .from('whatsapp_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    let dbResult;
    if (existingAccount) {
      dbResult = await db.from('whatsapp_accounts').update({
        provider: 'GUPSHUP',
        gupshup_app_name: appName,
        gupshup_api_key: encryptedKey,
        phone_number_id: phoneNumber,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      }).eq('id', existingAccount.id);
    } else {
      dbResult = await db.from('whatsapp_accounts').insert({
        tenant_id: tenantId,
        provider: 'GUPSHUP',
        gupshup_app_name: appName,
        gupshup_api_key: encryptedKey,
        phone_number_id: phoneNumber,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      });
    }

    if (dbResult.error) {
      return NextResponse.json({ error: dbResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
