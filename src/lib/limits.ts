import { db } from './db';
import { PLANS, PlanType } from './plans';

export async function checkLimit(tenantId: string, type: 'campaigns' | 'contacts') {
  const { data: tenant, error } = await db
    .from('tenants')
    .select('plan_type, subscription_status, current_period_end, campaigns_sent_today, last_usage_reset')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    throw new Error('Tenant not found');
  }

  // Basic plan check
  if (tenant.plan_type === 'starter') {
     // Starter is always allowed within its own limits
  } else {
    // For paid plans, check subscription status
    const isValidStatus = ['active', 'authenticated', 'cancelled'].includes(tenant.subscription_status);
    if (!isValidStatus) return false;

    // If cancelled, check if we are past the current_period_end
    if (tenant.subscription_status === 'cancelled' && tenant.current_period_end) {
      if (new Date() > new Date(tenant.current_period_end)) return false;
    }
  }

  const plan = PLANS[tenant.plan_type as PlanType] || PLANS.starter;

  if (type === 'campaigns') {
    // Check if we need to reset the daily counter
    const now = new Date();
    const lastReset = new Date(tenant.last_usage_reset);
    
    if (now.toDateString() !== lastReset.toDateString()) {
      // It's a new day, reset the counter
      await db.from('tenants').update({ 
        campaigns_sent_today: 0, 
        last_usage_reset: now.toISOString() 
      }).eq('id', tenantId);
      return true; // Counter reset, so we're definitely under the limit
    }

    if (tenant.campaigns_sent_today >= plan.maxCampaignsPerDay) {
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
    const { data: tenant } = await db
      .from('tenants')
      .select('campaigns_sent_today')
      .eq('id', tenantId)
      .single();

    if (tenant) {
      await db.from('tenants').update({ 
        campaigns_sent_today: (tenant.campaigns_sent_today || 0) + 1 
      }).eq('id', tenantId);
    }
  }
}
