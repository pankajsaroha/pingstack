import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!tenant || !tenant.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel at the end of the current cycle
    await razorpay.subscriptions.cancel(tenant.razorpay_subscription_id, true);

    // Update DB status = cancelled
    await db.from('tenants').update({
      subscription_status: 'cancelled'
    }).eq('id', tenantId);

    return NextResponse.json({ success: true, message: 'Subscription will be cancelled at the end of the period.' });

  } catch (err: any) {
    console.error('Razorpay Cancellation Error:', err);
    return NextResponse.json({ error: 'Failed to cancel subscription', message: err.message }, { status: 500 });
  }
}
