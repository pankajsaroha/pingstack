import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { logAdminAudit } from '@/lib/server/admin-audit';
import { connection } from '@/lib/queue';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db || !admin) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { confirmName, reason } = body;

    const { data: tenant, error: fetchErr } = await db
      .from('tenants')
      .select('id, name, public_id')
      .eq('id', id)
      .single();

    if (fetchErr || !tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (confirmName?.trim() !== tenant.name.trim()) {
      return NextResponse.json({ error: 'Confirmation business name does not match.' }, { status: 400 });
    }

    // Tenant-scoped tables to delete explicitly if foreign keys are set to restrict
    const tenantTables = [
      'messages',
      'group_contacts',
      'campaigns',
      'templates',
      'contacts',
      'groups',
      'whatsapp_accounts',
      'billing_transactions',
      'developer_apps',
      'support_tickets',
      'feedback',
      'users',
    ];

    for (const table of tenantTables) {
      try {
        await db.from(table).delete().eq('tenant_id', id);
      } catch (tableErr) {
        console.warn(`[Delete Business] Note deleting from ${table}:`, tableErr);
      }
    }

    // Delete tenant record
    const { error: deleteErr } = await db.from('tenants').delete().eq('id', id);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Clear Redis cache
    if (connection && connection.status === 'ready') {
      try {
        await connection.del(`tenant:me:${id}`);
        await connection.del(`stats:${id}`);
      } catch {}
    }

    // Log destructive action
    await logAdminAudit({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_BUSINESS',
      targetTenantId: id,
      targetTenantName: tenant.name,
      metadata: {
        publicId: tenant.public_id,
        reason: reason || 'Business deleted by Admin',
      },
      ipAddress: req.headers.get('x-forwarded-for') || null,
    });

    return NextResponse.json({
      success: true,
      message: `Business "${tenant.name}" (${tenant.public_id}) was permanently deleted.`,
    });
  } catch (err: any) {
    console.error('[Admin Delete Business API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete business' }, { status: 500 });
  }
}
