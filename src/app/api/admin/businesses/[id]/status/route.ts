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
    const { action, reason } = body; // action: 'suspend' | 'reactivate'

    if (!['suspend', 'reactivate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be suspend or reactivate.' }, { status: 400 });
    }

    const { data: tenant, error: fetchErr } = await db
      .from('tenants')
      .select('id, name, subscription_status')
      .eq('id', id)
      .single();

    if (fetchErr || !tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const newStatus = action === 'suspend' ? 'suspended' : 'active';

    const { error: updateErr } = await db
      .from('tenants')
      .update({ subscription_status: newStatus })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Invalidate Redis cache
    if (connection && connection.status === 'ready') {
      try {
        await connection.del(`tenant:me:${id}`);
        await connection.del(`stats:${id}`);
      } catch {}
    }

    // Log admin audit
    await logAdminAudit({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: action === 'suspend' ? 'SUSPEND_BUSINESS' : 'REACTIVATE_BUSINESS',
      targetTenantId: id,
      targetTenantName: tenant.name,
      metadata: {
        previousStatus: tenant.subscription_status,
        newStatus,
        reason: reason || 'Action performed by Admin',
      },
      ipAddress: req.headers.get('x-forwarded-for') || null,
    });

    return NextResponse.json({
      success: true,
      message: `Business "${tenant.name}" has been ${action === 'suspend' ? 'suspended' : 'reactivated'}.`,
      status: newStatus,
    });
  } catch (err: any) {
    console.error('[Admin Status API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update business status' }, { status: 500 });
  }
}
