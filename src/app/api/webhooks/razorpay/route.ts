import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_secret';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('Invalid Razorpay Webhook Signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.event) {
      case 'subscription.activated':
      case 'subscription.authenticated':
      case 'subscription.updated': {
        const subscription = event.payload.subscription.entity;
        const tenantId = subscription.notes?.tenantId;
        const planName = subscription.notes?.planName?.toLowerCase();

        if (tenantId && planName) {
          const updateData: any = {
            plan_type: planName,
            subscription_status: 'active',
            razorpay_subscription_id: subscription.id,
            current_period_end: new Date(subscription.current_end * 1000).toISOString()
          };
          
          await db.from('tenants').update(updateData).eq('id', tenantId);
        }
        break;
      }
      case 'payment.captured': {
        // Option to verify payment and extend period
        break;
      }
      case 'subscription.cancelled': {
        const subscription = event.payload.subscription.entity;
        const tenantId = subscription.notes?.tenantId;

        if (tenantId) {
          await db.from('tenants').update({
            subscription_status: 'cancelled'
          }).eq('id', tenantId);
        }
        break;
      }
      case 'subscription.expired': {
        const subscription = event.payload.subscription.entity;
        const tenantId = subscription.notes?.tenantId;

        if (tenantId) {
          await db.from('tenants').update({
            plan_type: 'starter',
            subscription_status: 'expired'
          }).eq('id', tenantId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Razorpay Webhook Processing Error:', err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
