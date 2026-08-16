import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { registerMetaPhoneNumber, fetchMetaPhoneNumberStatus } from '@/lib/whatsapp';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();

    if (!whatsappAccount || !whatsappAccount.phone_number_id || !whatsappAccount.access_token) {
      return NextResponse.json({ error: 'No Meta WhatsApp account connected' }, { status: 400 });
    }

    const accessToken = decrypt(whatsappAccount.access_token);
    const phoneNumberId = whatsappAccount.phone_number_id;

    console.log(`[Meta Register API] Triggering registration for phone_number_id: ${phoneNumberId}...`);
    const regResult = await registerMetaPhoneNumber(phoneNumberId, accessToken, '123456');

    if (!regResult.success) {
      return NextResponse.json({
        error: `Meta Registration Failed: ${regResult.error || 'Unknown error'}`
      }, { status: 400 });
    }

    // Check live status after registration
    const metaStatus = await fetchMetaPhoneNumberStatus(phoneNumberId, accessToken);

    const newStatus = 'ACTIVE';
    await db
      .from('whatsapp_accounts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', whatsappAccount.id);

    await invalidateTenantCache(tenantId);

    return NextResponse.json({
      success: true,
      message: 'Phone number registered successfully with Meta Cloud API!',
      status: newStatus,
      metaStatus
    });

  } catch (err: any) {
    console.error('[Meta Register Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
