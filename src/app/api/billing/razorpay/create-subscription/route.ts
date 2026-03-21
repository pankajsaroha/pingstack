import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { db } from '@/lib/db';

const PLAN_IDS: Record<string, string> = {
  Growth: process.env.RAZORPAY_PLAN_ID_GROWTH || 'plan_growth_placeholder',
  Pro: process.env.RAZORPAY_PLAN_ID_PRO || 'plan_pro_placeholder'
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { planName } = await req.json();
    const planId = PLAN_IDS[planName];

    if (!planId) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Create Razorpay Subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120, // 10 years for monthly
      quantity: 1,
      customer_notify: 1,
      notes: {
        tenantId,
        planName
      }
    });

    // We don't update the tenant plan yet, waiting for webhook/payment success
    return NextResponse.json({ subscription_id: subscription.id });

  } catch (err: any) {
    console.error('Razorpay Subscription Error:', err);
    return NextResponse.json({ error: 'Failed to create subscription', message: err.message }, { status: 500 });
  }
}
