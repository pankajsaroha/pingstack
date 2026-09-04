import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const [tenantsRes, auditLogsRes] = await Promise.all([
      db.from('tenants').select('id, name, public_id, plan_type, subscription_status, created_at, current_period_end'),
      db.from('admin_audit_logs').select('*').eq('action', 'CHANGE_PLAN').order('created_at', { ascending: false }).limit(15),
    ]);

    const tenants = tenantsRes.data || [];
    const auditLogs = auditLogsRes.data || [];

    let starterCount = 0;
    let growthCount = 0;
    let proCount = 0;

    let activeSubscriptions = 0;
    let suspendedCount = 0;

    tenants.forEach((t: any) => {
      const plan = (t.plan_type || 'starter').toLowerCase();
      if (plan === 'growth') growthCount += 1;
      else if (plan === 'pro') proCount += 1;
      else starterCount += 1;

      if (t.subscription_status === 'suspended') suspendedCount += 1;
      else activeSubscriptions += 1;
    });

    const totalBusinesses = tenants.length;

    // Estimated MRR calculation based on pricing tiers
    // Starter: ₹0, Growth: ₹199/mo, Pro: ₹999/mo
    const estimatedMrr = growthCount * 199 + proCount * 999;
    const estimatedArr = estimatedMrr * 12;

    const calcPct = (c: number) => (totalBusinesses > 0 ? Number(((c / totalBusinesses) * 100).toFixed(1)) : 0);

    const planBreakdown = [
      {
        plan: 'Starter',
        price: '₹0 / mo (Free early access)',
        count: starterCount,
        percentage: calcPct(starterCount),
        monthlyRevenue: 0,
      },
      {
        plan: 'Growth',
        price: '₹199 / mo',
        count: growthCount,
        percentage: calcPct(growthCount),
        monthlyRevenue: growthCount * 199,
      },
      {
        plan: 'Pro',
        price: '₹999 / mo',
        count: proCount,
        percentage: calcPct(proCount),
        monthlyRevenue: proCount * 999,
      },
    ];

    return NextResponse.json({
      metrics: {
        totalBusinesses,
        activeSubscriptions,
        suspendedCount,
        estimatedMrr,
        estimatedArr,
        starterCount,
        growthCount,
        proCount,
      },
      planBreakdown,
      recentPlanChanges: auditLogs.map((a: any) => ({
        id: a.id,
        businessId: a.target_tenant_id,
        businessName: a.target_tenant_name || 'Business',
        previousPlan: a.metadata?.previousPlan || 'starter',
        newPlan: a.metadata?.newPlan || 'growth',
        adminEmail: a.admin_email,
        note: a.metadata?.note,
        createdAt: a.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[Admin Subscriptions API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch subscription analytics' }, { status: 500 });
  }
}
