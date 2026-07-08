import { headers } from 'next/headers';
import { dbAdmin as db } from '@/lib/db';
import { ensureFreshLimits } from '@/lib/limits';

export async function getTenantServer() {
  const reqHeaders = await headers();
  const tenantId = reqHeaders.get('x-tenant-id');
  const userId = reqHeaders.get('x-user-id');

  if (!tenantId || !db) {
    return null;
  }

  try {
    const { data: tenantData, error: tError } = await db
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tError || !tenantData) {
      console.error('[getTenantServer] tenant query failed or empty:', tError);
      return null;
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

    let userName = 'User';
    if (userId) {
      const { data: userData } = await db.from('users').select('name').eq('id', userId).maybeSingle();
      if (userData?.name) {
        userName = userData.name;
      }
    }

    const { data: whatsappAccount } = await db
      .from('whatsapp_accounts')
      .select('id, provider, status, phone_number_id, business_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

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
}
