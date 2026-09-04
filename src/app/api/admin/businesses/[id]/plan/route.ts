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
    const { planType, currentPeriodEnd, note } = body;

    if (!['starter', 'growth', 'pro'].includes(planType)) {
      return NextResponse.json({ error: 'Invalid plan type. Must be starter, growth, or pro.' }, { status: 400 });
    }

    // Fetch existing tenant
    const { data: tenant, error: fetchErr } = await db
      .from('tenants')
      .select('id, name, plan_type')
      .eq('id', id)
      .single();

    if (fetchErr || !tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const previousPlan = tenant.plan_type || 'starter';

    // Update tenant in DB
    const updateData: any = {
      plan_type: planType,
      plan: planType === 'starter' ? 'free' : 'paid',
    };

    if (currentPeriodEnd) {
      updateData.current_period_end = currentPeriodEnd;
    }

    const { error: updateErr } = await db
      .from('tenants')
      .update(updateData)
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Invalidate Redis cache for this tenant
    if (connection && connection.status === 'ready') {
      try {
        await connection.del(`tenant:me:${id}`);
        await connection.del(`stats:${id}`);
      } catch {}
    }

    // Log administrative audit event
    await logAdminAudit({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: 'CHANGE_PLAN',
      targetTenantId: id,
      targetTenantName: tenant.name,
      metadata: {
        previousPlan,
        newPlan: planType,
        currentPeriodEnd,
        note: note || 'Plan updated manually by Admin',
      },
      ipAddress: req.headers.get('x-forwarded-for') || null,
    });

    return NextResponse.json({
      success: true,
      message: `Plan successfully updated from ${previousPlan.toUpperCase()} to ${planType.toUpperCase()}`,
      planType,
    });
  } catch (err: any) {
    console.error('[Admin Change Plan API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update plan' }, { status: 500 });
  }
}
