import { db } from './db';
import { PLANS, PlanType } from './plans';

export async function checkLimit(tenantId: string, type: 'campaigns' | 'contacts') {
  const { data: tenant, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    if (error?.code === 'PGRST116') { // No rows found
       throw new Error(`Tenant not found for ID: ${tenantId}`);
    }
    // If it's a structural error (like missing columns), we might still want to proceed defensively
    console.warn('Limit check encountered a non-fatal structural error:', error?.message);
  }

  // Defensively extract fields with defaults if columns are missing
  const planType = (tenant as any)?.plan_type || 'starter';
  const subStatus = (tenant as any)?.subscription_status || 'active';
  const periodEnd = (tenant as any)?.current_period_end;
  const campaignsSentToday = (tenant as any)?.campaigns_sent_today || 0;
  const lastReset = (tenant as any)?.last_usage_reset;

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
    // Check if we need to reset the daily counter
    const now = new Date();
    // Use lastReset if exists, otherwise assume reset needed
    const lastResetDate = lastReset ? new Date(lastReset) : new Date(0);
    
    if (now.toDateString() !== lastResetDate.toDateString()) {
      // It's a new day, reset the counter
      // Only attempt update if the column exists (defensive)
      try {
        await db.from('tenants').update({ 
          campaigns_sent_today: 0, 
          last_usage_reset: now.toISOString() 
        }).eq('id', tenantId);
      } catch (e) {
        console.warn('Could not update usage counters - columns may be missing');
      }
      return true; // Counter reset, so we're definitely under the limit
    }

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
