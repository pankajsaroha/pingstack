import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe signature or webhook secret');
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const planName = session.metadata?.planName?.toLowerCase();

        if (tenantId && planName) {
          await db.from('tenants').update({
            plan_type: planName,
            subscription_status: 'active',
            stripe_subscription_id: session.subscription as string,
            current_period_end: new Date().toISOString() // Should be updated by subscription.updated
          }).eq('id', tenantId);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const planName = subscription.metadata?.planName?.toLowerCase();

        const { data: tenant } = await db.from('tenants').select('id').eq('stripe_customer_id', customerId).single();
        if (tenant) {
          const updateData: any = {
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          };
          
          if (planName) updateData.plan_type = planName;

          await db.from('tenants').update(updateData).eq('id', tenant.id);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: tenant } = await db.from('tenants').select('id').eq('stripe_customer_id', customerId).single();
        if (tenant) {
          await db.from('tenants').update({
            plan_type: 'starter',
            subscription_status: 'cancelled'
          }).eq('id', tenant.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
