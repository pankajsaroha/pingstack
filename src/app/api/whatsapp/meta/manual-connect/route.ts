import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  if (userId) {
    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canManage = await hasWorkspacePermission(userId, tenantId, 'settings_manage');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage WhatsApp settings.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }
  }

  try {
    const { accessToken, wabaId, phoneNumberId } = await req.json();

    if (!accessToken || !wabaId || !phoneNumberId) {
      return NextResponse.json({ error: 'All fields (Token, WABA ID, Phone ID) are required.' }, { status: 400 });
    }

    const encryptedToken = encrypt(accessToken);

    // Check if an account already exists for this tenant
    const { data: existingAccount } = await db
      .from('whatsapp_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    let dbResult;
    if (existingAccount) {
      // Update existing
      dbResult = await db.from('whatsapp_accounts').update({
        provider: 'META',
        business_id: wabaId,
        phone_number_id: phoneNumberId,
        access_token: encryptedToken,
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      }).eq('id', existingAccount.id);
    } else {
      // Insert new
      dbResult = await db.from('whatsapp_accounts').insert({
        tenant_id: tenantId,
        provider: 'META',
        business_id: wabaId,
        phone_number_id: phoneNumberId,
        access_token: encryptedToken,
        status: 'ACTIVE'
      });
    }

    if (dbResult.error) throw dbResult.error;

    await invalidateTenantCache(tenantId);

    return NextResponse.json({ success: true, message: 'WhatsApp manually connected successfully.' });

  } catch (err: any) {
    console.error('Manual Connect Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
