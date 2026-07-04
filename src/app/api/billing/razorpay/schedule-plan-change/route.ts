import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { db } from '@/lib/db';

type SchedulePlanChangeBody = {
  planName?: string;
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { planName } = await req.json() as SchedulePlanChangeBody;
    if (!planName) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Fetch tenant
    const { data: tenant, error } = await db
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const currentPlanRaw = tenant.plan_type || 'starter';
    const currentPlan = currentPlanRaw.includes('_pending_') ? currentPlanRaw.split('_pending_')[0] : currentPlanRaw;
    const subStatus = tenant.subscription_status;
    const razorpaySubId = tenant.razorpay_subscription_id;

    const newPlan = planName.toLowerCase();

    if (currentPlan === newPlan) {
      return NextResponse.json({ error: 'You are already on this plan' }, { status: 400 });
    }

    // If subscription is active, schedule transition at cycle end
    if (subStatus === 'active' && razorpaySubId) {
      // 1. Cancel current subscription at cycle end
      await razorpay.subscriptions.cancel(razorpaySubId, true);

      // 2. Set DB pending_plan_type to newPlan and status to "cancelled"
      await db
        .from('tenants')
        .update({
          pending_plan_type: newPlan,
          subscription_status: 'cancelled'
        })
        .eq('id', tenantId);

      return NextResponse.json({ 
        success: true, 
        message: `Plan change scheduled. Your plan will transition to ${planName} at the end of the current billing cycle.` 
      });
    } else {
      // If no active subscription, plan changes are immediate (handled by checkout/Razorpay modal for paid plans, or directly in DB for Starter)
      if (newPlan === 'starter') {
        await db
          .from('tenants')
          .update({
            plan_type: 'starter',
            subscription_status: null // Back to trial/unpaid
          })
          .eq('id', tenantId);
        return NextResponse.json({ success: true, message: 'Plan downgraded to Starter successfully.' });
      }
      
      return NextResponse.json({ error: 'Please subscribe to activate this plan immediately.' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Billing] Schedule Plan Change Error:', err);
    return NextResponse.json({ 
      error: 'Plan change scheduling failed', 
      message: err.message || 'Razorpay/Database error' 
    }, { status: 500 });
  }
}
