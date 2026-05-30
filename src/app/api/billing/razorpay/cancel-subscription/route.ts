import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { db } from '@/lib/db';

type TenantSubscriptionRow = {
  razorpay_subscription_id: string | null;
};

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { data: tenantData } = await db.from('tenants').select('razorpay_subscription_id').eq('id', tenantId).single();
    const tenant = tenantData as TenantSubscriptionRow | null;
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

  } catch (err: unknown) {
    console.error('Razorpay Cancellation Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
    return NextResponse.json({ error: 'Failed to cancel subscription', message }, { status: 500 });
  }
}
