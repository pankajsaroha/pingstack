import { db } from './db';
import { PLANS, PlanType } from './plans';

export async function ensureFreshLimits(tenantId: string, tenant: any) {
  const lastReset = (tenant as any)?.last_usage_reset;
  const tTimezone = (tenant as any)?.timezone || 'UTC';

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { 
    timeZone: tTimezone, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  
  const localDateString = formatter.format(now);
  const lastResetDate = lastReset ? new Date(lastReset) : new Date(0);
  const lastResetLocalString = lastReset ? formatter.format(lastResetDate) : '';
  
  if (localDateString !== lastResetLocalString) {
    try {
      const { data: updated } = await db.from('tenants').update({ 
        campaigns_sent_today: 0, 
        last_usage_reset: now.toISOString() 
      }).eq('id', tenantId).select().single();
      return updated;
    } catch (e) {
      console.warn('Could not update usage counters:', e);
    }
  }
  return tenant;
}

export async function checkLimit(tenantId: string, type: 'campaigns' | 'contacts') {
  let { data: tenant, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    if (error?.code === 'PGRST116') {
       throw new Error(`Tenant not found for ID: ${tenantId}`);
    }
    console.warn('Limit check encountered a non-fatal structural error:', error?.message);
  }

  // Ensure limits are fresh (Timezone Aware Reset)
  tenant = await ensureFreshLimits(tenantId, tenant);

  // Defensively extract fields with defaults if columns are missing
  const planType = (tenant as any)?.plan_type || 'starter';
  const subStatus = (tenant as any)?.subscription_status || 'active';
  const periodEnd = (tenant as any)?.current_period_end;
  const campaignsSentToday = (tenant as any)?.campaigns_sent_today || 0;

  // Basic plan check
  if (planType === 'starter') {
     // Starter is always allowed within its own limits
  } else {
    // For paid plans, check subscription status
    const isValidStatus = ['active', 'authenticated', 'cancelled'].includes(subStatus);
    if (!isValidStatus) return false;

    // If cancelled, check if we are past the current_period_end
    if (subStatus === 'cancelled' && periodEnd) {
      if (new Date() > new Date(periodEnd)) return false;
    }
  }

  const plan = PLANS[planType as PlanType] || PLANS.starter;

  if (type === 'campaigns') {
    if (campaignsSentToday >= plan.maxCampaignsPerDay) {
      return false;
    }
  }

  if (type === 'contacts') {
    const { count } = await db
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if ((count || 0) >= plan.maxContacts) {
      return false;
    }
  }

  return true;
}

export async function incrementUsage(tenantId: string, type: 'campaigns') {
  if (type === 'campaigns') {
    try {
      const { data: tenant } = await db
        .from('tenants')
        .select('campaigns_sent_today')
        .eq('id', tenantId)
        .single();

      if (tenant && (tenant as any).campaigns_sent_today !== undefined) {
        await db.from('tenants').update({ 
          campaigns_sent_today: ((tenant as any).campaigns_sent_today || 0) + 1 
        }).eq('id', tenantId);
      }
    } catch (e) {
      console.warn('Could not increment usage - columns may be missing');
    }
  }
}
