import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateTenantCache } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  if (userId) {
    const { hasWorkspacePermission } = await import('@/lib/server/teams');
    const canManage = await hasWorkspacePermission(userId, tenantId, 'settings_manage');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage WhatsApp settings.', code: 'PERMISSION_DENIED' }, { status: 403 });
    }
  }

  try {
    const { error } = await db
      .from('whatsapp_accounts')
      .delete()
      .eq('tenant_id', tenantId);

    if (error) throw error;

    await invalidateTenantCache(tenantId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Reset Error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
  }
}
