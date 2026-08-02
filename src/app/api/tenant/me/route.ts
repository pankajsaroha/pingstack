import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { ensureFreshLimits } from '@/lib/limits';
import { connection as redis } from '@/lib/queue';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  if (!tenantId) {
    console.error('[tenant/me] Missing x-tenant-id header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    console.error('[tenant/me] Database client is not initialized');
    return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
  }

  try {
    const cacheKey = `tenant:me:${tenantId}`;
    let cachedProfile: any = null;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cachedProfile = JSON.parse(cached);
      }
    } catch (e) {
      console.error('[tenant/me] Redis get error:', e);
    }

    let tenantData: any = null;
    let whatsappAccount: any = null;
    let userName = 'User';

    if (cachedProfile) {
      tenantData = cachedProfile.tenantData;
      whatsappAccount = cachedProfile.whatsappAccount;
      userName = cachedProfile.userName;
    } else {
      // Single joined query for tenant + whatsapp_accounts & parallel user lookup
      const [tenantResult, userResult] = await Promise.all([
        db.from('tenants')
          .select('*, whatsapp_accounts(id, provider, status, phone_number_id, business_id)')
          .eq('id', tenantId)
          .single(),
        userId ? db.from('users').select('name').eq('id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (tenantResult.error) {
        console.error('[tenant/me] tenant query failed', { tenantId, error: tenantResult.error });
        return NextResponse.json({ error: 'Tenant lookup failed', details: tenantResult.error.message }, { status: 500 });
      }

      tenantData = tenantResult.data;
      const waArray = tenantData.whatsapp_accounts;
      whatsappAccount = Array.isArray(waArray) && waArray.length > 0 ? waArray[0] : null;

      // Clean relational key to match original tenants table shape
      delete tenantData.whatsapp_accounts;

      if (userResult.data?.name) {
        userName = userResult.data.name;
      }

      // Cache profile values for 30 seconds
      try {
        await redis.set(
          cacheKey,
          JSON.stringify({ tenantData, whatsappAccount, userName }),
          'EX',
          30
        );
      } catch (e) {
        console.error('[tenant/me] Redis set error:', e);
      }
    }

    const tenant = await ensureFreshLimits(tenantId, tenantData);

    const planType = tenant?.plan_type || 'starter';
    const pendingPlanType = tenant?.pending_plan_type || null;

    const subStatus = tenant?.subscription_status;
    const createdAt = tenant?.created_at ? new Date(tenant.created_at) : new Date();
    
    const isTrial = planType === 'starter' && subStatus !== 'active';
    const trialExpiresAt = new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const trialDaysLeft = Math.max(0, Math.ceil((trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const trialExpired = isTrial && now > trialExpiresAt;

    return NextResponse.json({
      ...tenant,
      plan_type: planType,
      pending_plan_type: pendingPlanType,
      user_name: userName,
      is_trial: isTrial,
      trial_expires_at: trialExpiresAt.toISOString(),
      trial_days_left: trialDaysLeft,
      trial_expired: trialExpired,
      whatsapp_account: whatsappAccount || null
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tenant/me] unexpected error', { tenantId, error: message, raw: err });
    return NextResponse.json({ error: 'Unexpected server error', details: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const body = await req.json();
    const { timezone } = body;

    const { data, error } = await db.from('tenants')
      .update({ timezone })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate Redis cache on profile updates
    const cacheKey = `tenant:me:${tenantId}`;
    try {
      await redis.del(cacheKey);
    } catch (e) {
      console.error('[tenant/me PATCH] Redis cache invalidate error:', e);
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tenant/me PATCH] unexpected error', { tenantId, error: message, raw: err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
