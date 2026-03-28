import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { db } from '@/lib/db';

const PLAN_IDS: Record<string, string> = {
  Growth: process.env.RAZORPAY_PLAN_ID_GROWTH || '',
  Pro: process.env.RAZORPAY_PLAN_ID_PRO || ''
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { planName } = await req.json();
    const planId = PLAN_IDS[planName];

    if (!planId) {
      console.error(`❌ [Razorpay] Missing Plan ID for ${planName}. Check your .env.local variables.`);
      return NextResponse.json({ 
        error: 'Configuration Error', 
        message: `Plan ID for ${planName} is not configured in environment variables.` 
      }, { status: 500 });
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
    console.error('❌ [Razorpay] Click Create Subscription Error:', err);
    return NextResponse.json({ 
      error: 'Subscription Creation Failed', 
      message: err.description || err.message || 'Razorpay API error' 
    }, { status: 500 });
  }
}
