import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

const PRICE_IDS: Record<string, string> = {
  Growth: process.env.STRIPE_PRICE_ID_GROWTH || 'price_growth_placeholder',
  Pro: process.env.STRIPE_PRICE_ID_PRO || 'price_pro_placeholder'
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { planName } = await req.json();
    const priceId = PRICE_IDS[planName];

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    let stripeCustomerId = tenant.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: `tenant_${tenant.public_id}@pingstack.com`, // Use actual user email if available
        name: tenant.name,
        metadata: { tenantId }
      });
      stripeCustomerId = customer.id;
      await db.from('tenants').update({ stripe_customer_id: stripeCustomerId }).eq('id', tenantId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancel`,
      metadata: { tenantId, planName }
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
