import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { db } from '@/lib/db';

type CreateSubscriptionBody = {
  planName?: string;
};

type RazorpayError = {
  description?: string;
  message?: string;
};

const PLAN_IDS: Record<string, string> = {
  Starter: process.env.RAZORPAY_PLAN_ID_STARTER || '',
  Growth: process.env.RAZORPAY_PLAN_ID_GROWTH || '',
  Pro: process.env.RAZORPAY_PLAN_ID_PRO || ''
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { planName } = await req.json() as CreateSubscriptionBody;
    if (!planName) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const planId = PLAN_IDS[planName];

    if (!planId) {
      console.error(`[Razorpay] Missing Plan ID for ${planName}. Check your .env.local variables.`);
      return NextResponse.json({
        error: 'Configuration Error',
        message: `Plan ID for ${planName} is not configured in environment variables.`
      }, { status: 500 });
    }

    const { data: tenant } = await db.from('tenants').select('id').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        tenantId,
        planName
      }
    });

    return NextResponse.json({ subscription_id: subscription.id });
  } catch (err: unknown) {
    console.error('[Razorpay] Click Create Subscription Error:', err);
    const error = err as RazorpayError;
    return NextResponse.json({
      error: 'Subscription Creation Failed',
      message: error.description || error.message || 'Razorpay API error'
    }, { status: 500 });
  }
}
