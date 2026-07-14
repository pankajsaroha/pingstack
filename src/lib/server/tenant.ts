import { headers } from 'next/headers';
import { cache } from 'react';
import { dbAdmin as db } from '@/lib/db';
import { ensureFreshLimits } from '@/lib/limits';
import { Tenant } from '@/types';

// cache() deduplicates repeated invocations of getTenantServer during a single page request lifecycle (e.g. layout + page renders)
export const getTenantServer = cache(async (): Promise<Tenant | null> => {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');
  const userId = reqHeaders.get('x-user-id');

  if (!tenantId || !db) {
    return null;
  }

  try {
    // Single joined query for tenant + whatsapp_accounts & parallel user name query
    const [tenantResult, userResult] = await Promise.all([
      db.from('tenants')
        .select('*, whatsapp_accounts(id, provider, status, phone_number_id, business_id)')
        .eq('id', tenantId)
        .single(),
      userId ? db.from('users').select('name').eq('id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);

    if (tenantResult.error || !tenantResult.data) {
      console.error('[getTenantServer] tenant query failed or empty:', tenantResult.error);
      return null;
    }

    const tenantData = tenantResult.data;
    const waArray = tenantData.whatsapp_accounts;
    const whatsappAccount = Array.isArray(waArray) && waArray.length > 0 ? waArray[0] : null;

    // Clean nested key to keep tenant shape consistent
    delete tenantData.whatsapp_accounts;

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

    let userName = 'User';
    if (userResult.data?.name) {
      userName = userResult.data.name;
    }

    return {
      ...tenant,
      plan_type: planType,
      pending_plan_type: pendingPlanType,
      user_name: userName,
      is_trial: isTrial,
      trial_expires_at: trialExpiresAt.toISOString(),
      trial_days_left: trialDaysLeft,
      trial_expired: trialExpired,
      whatsapp_account: whatsappAccount || null,
    };
  } catch (err) {
    console.error('[getTenantServer] unexpected error:', err);
    return null;
  }
});
