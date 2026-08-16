import { headers } from 'next/headers';
import { cache } from 'react';
import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';
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

  const cacheKey = `tenant:me:${tenantId}`;

  // 1. Read cached tenant profile from Redis across soft page navigations
  if (connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('[getTenantServer] Redis read error:', e);
    }
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
    let whatsappAccount = Array.isArray(waArray) && waArray.length > 0 ? waArray[0] : null;

    // Auto-check live status with Meta if pending
    if (whatsappAccount && whatsappAccount.provider === 'META' && whatsappAccount.phone_number_id && whatsappAccount.access_token && whatsappAccount.status !== 'CONNECTED') {
      try {
        const { decrypt } = await import('@/lib/encryption');
        const { fetchMetaPhoneNumberStatus } = await import('@/lib/whatsapp');
        const decryptedToken = decrypt(whatsappAccount.access_token);
        const metaStatus = await fetchMetaPhoneNumberStatus(whatsappAccount.phone_number_id, decryptedToken);
        
        if (metaStatus.isApproved) {
          whatsappAccount.status = 'CONNECTED';
          await db.from('whatsapp_accounts').update({ status: 'CONNECTED', updated_at: new Date().toISOString() }).eq('id', whatsappAccount.id);
        } else if (metaStatus.status && metaStatus.status !== whatsappAccount.status) {
          whatsappAccount.status = metaStatus.status;
          await db.from('whatsapp_accounts').update({ status: metaStatus.status, updated_at: new Date().toISOString() }).eq('id', whatsappAccount.id);
        }
      } catch (checkErr) {
        console.warn('[getTenantServer] Meta live status check warning:', checkErr);
      }
    }

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

    const fullTenant: Tenant = {
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

    // 2. Cache in Redis for 5 minutes (300 seconds)
    if (connection && connection.status === 'ready') {
      try {
        await connection.set(cacheKey, JSON.stringify(fullTenant), 'EX', 300);
      } catch (e) {
        console.error('[getTenantServer] Redis write error:', e);
      }
    }

    return fullTenant;
  } catch (err) {
    console.error('[getTenantServer] unexpected error:', err);
    return null;
  }
});
