import { db } from './db';
import { PLANS, PlanType } from './plans';

export async function checkAndApplyPendingPlan(tenantId: string, tenant: any) {
  if (!db || !tenant) return tenant;

  const pendingPlan = tenant.pending_plan_type;
  const periodEnd = tenant.current_period_end;

  if (pendingPlan) {
    const now = new Date();
    const periodEndDate = periodEnd ? new Date(periodEnd) : new Date(0);

    if (now > periodEndDate) {
      try {
        const { data: updated, error } = await db
          .from('tenants')
          .update({ 
            plan_type: pendingPlan,
            pending_plan_type: null,
            subscription_status: 'expired'
          })
          .eq('id', tenantId)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } catch (e) {
        console.warn('Could not auto-apply pending plan transition:', e);
      }
    }
  }

  return tenant;
}

export async function ensureFreshLimits(tenantId: string, tenant: any) {
  tenant = await checkAndApplyPendingPlan(tenantId, tenant);
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
      if (!db) return tenant;
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
  if (!db) return true;
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

  // Ensure limits are fresh (Timezone Aware Reset & Pending Plan Transition)
  tenant = await ensureFreshLimits(tenantId, tenant);

  // Defensively extract fields with defaults if columns are missing
  const planType = (tenant as any)?.plan_type || 'starter';
  const subStatus = (tenant as any)?.subscription_status;
  const periodEnd = (tenant as any)?.current_period_end;
  const campaignsSentToday = (tenant as any)?.campaigns_sent_today || 0;

  // Basic plan check
  if (planType === 'starter') {
    // Starter trial check: 15 days trial from created_at if subscription is not active
    if (subStatus !== 'active') {
      const createdAt = (tenant as any)?.created_at ? new Date((tenant as any).created_at) : new Date();
      const trialExpiry = new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000);
      if (new Date() > trialExpiry) {
        return false; // Trial has ended
      }
    }
  } else {
    // For paid plans, check subscription status
    const isValidStatus = ['active', 'authenticated', 'cancelled'].includes(subStatus || 'active');
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
    if (!db) return true;
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
      if (!db) return;
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
