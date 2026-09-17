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
    // Starter plan is 100% Free during Early Access - no 15-day trial block
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
    const dailyLimit = plan.templateSendsPerDay || plan.maxCampaignsPerDay || 100;
    if (campaignsSentToday >= dailyLimit) {
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

export async function getContactQuota(tenantId: string) {
  if (!db) return { maxContacts: 500, currentCount: 0, remainingQuota: 500, planType: 'starter' };

  let { data: tenant } = await db.from('tenants').select('plan_type').eq('id', tenantId).single();
  const planType = (tenant as any)?.plan_type || 'starter';
  const plan = PLANS[planType as PlanType] || PLANS.starter;

  const { count } = await db
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const currentCount = count || 0;
  const maxContacts = plan.maxContacts;
  const remainingQuota = Math.max(0, maxContacts - currentCount);

  return {
    planType,
    maxContacts,
    currentCount,
    remainingQuota
  };
}

export async function getTemplateQuota(tenantId: string) {
  if (!db) return { maxTemplates: 10, currentCount: 0, remainingQuota: 10, planType: 'starter' };

  let { data: tenant } = await db.from('tenants').select('plan_type').eq('id', tenantId).single();
  const planType = (tenant as any)?.plan_type || 'starter';
  const plan = PLANS[planType as PlanType] || PLANS.starter;

  const { count } = await db
    .from('templates')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const currentCount = count || 0;
  const maxTemplates = plan.maxSavedTemplates;
  const remainingQuota = Math.max(0, maxTemplates - currentCount);

  return {
    planType,
    maxTemplates,
    currentCount,
    remainingQuota
  };
}

export async function checkTemplateLimit(tenantId: string) {
  const quota = await getTemplateQuota(tenantId);
  return quota.remainingQuota > 0;
}

export async function checkTemplateSendLimit(tenantId: string, count: number = 1) {
  if (!db) return true;
  let { data: tenant, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) return true;

  tenant = await ensureFreshLimits(tenantId, tenant);
  const planType = (tenant as any)?.plan_type || 'starter';
  const plan = PLANS[planType as PlanType] || PLANS.starter;
  const campaignsSentToday = (tenant as any)?.campaigns_sent_today || 0;
  const dailyLimit = plan.templateSendsPerDay || plan.maxCampaignsPerDay || 100;

  return (campaignsSentToday + count) <= dailyLimit;
}

export async function incrementTemplateSendUsage(tenantId: string, count: number = 1) {
  if (!db || count <= 0) return;
  try {
    const { data: tenant } = await db
      .from('tenants')
      .select('campaigns_sent_today')
      .eq('id', tenantId)
      .single();

    if (tenant && (tenant as any).campaigns_sent_today !== undefined) {
      await db.from('tenants').update({ 
        campaigns_sent_today: ((tenant as any).campaigns_sent_today || 0) + count 
      }).eq('id', tenantId);
    }
  } catch (e) {
    console.warn('Could not increment template send usage:', e);
  }
}

export async function getAutomationQuota(tenantId: string) {
  if (!db) return { maxRules: 0, currentCount: 0, remainingQuota: 0, planType: 'starter', isAdvanced: false };

  let { data: tenant } = await db.from('tenants').select('plan_type').eq('id', tenantId).single();
  const planType = (tenant as any)?.plan_type || 'starter';
  const plan = PLANS[planType as PlanType] || PLANS.starter;

  let currentCount = 0;
  try {
    const { count } = await db
      .from('automation_rules')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    currentCount = count || 0;
  } catch (e) {
    // If table doesn't exist yet, fallback to 0
    currentCount = 0;
  }

  const maxRules = plan.maxAutomationRules || 0;
  const remainingQuota = maxRules === Infinity ? Infinity : Math.max(0, maxRules - currentCount);

  return {
    planType,
    maxRules,
    currentCount,
    remainingQuota,
    isAdvanced: planType === 'pro'
  };
}

export async function checkAutomationLimit(tenantId: string) {
  const quota = await getAutomationQuota(tenantId);
  return quota.remainingQuota > 0;
}

import { connection } from './queue';

export async function getAiTemplateQuota(tenantId: string) {
  if (!db) return { planType: 'starter', maxRequests: 0, usedRequests: 0, remainingQuota: 0 };

  const { data: tenant } = await db.from('tenants').select('plan_type').eq('id', tenantId).single();
  const planType = ((tenant as any)?.plan_type || 'starter').toLowerCase() as PlanType;
  const plan = PLANS[planType] || PLANS.starter;
  const maxRequests = plan.maxAiTemplatesPerMonth || 0;

  if (maxRequests === 0) {
    return { planType, maxRequests: 0, usedRequests: 0, remainingQuota: 0 };
  }

  const d = new Date();
  const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const redisKey = `quota:ai_templates:${tenantId}:${ym}`;
  let usedRequests = 0;

  if (connection && connection.status === 'ready') {
    try {
      const val = await connection.get(redisKey);
      usedRequests = parseInt(val || '0', 10);
    } catch (e) {
      console.warn('[AI Quota] Redis get failed:', e);
    }
  }

  const remainingQuota = Math.max(0, maxRequests - usedRequests);

  return {
    planType,
    maxRequests,
    usedRequests,
    remainingQuota
  };
}

export async function checkAiTemplateRateLimit(tenantId: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  // Max 3 requests per 10 minutes (600 seconds)
  const RATE_LIMIT_WINDOW = 600;
  const MAX_REQUESTS_PER_WINDOW = 3;

  if (!connection || connection.status !== 'ready') {
    return { allowed: true };
  }

  const key = `ratelimit:ai_templates:${tenantId}`;
  try {
    const current = await connection.incr(key);
    if (current === 1) {
      await connection.expire(key, RATE_LIMIT_WINDOW);
    }

    if (current > MAX_REQUESTS_PER_WINDOW) {
      const ttl = await connection.ttl(key);
      return { allowed: false, retryAfterSeconds: Math.max(1, ttl) };
    }

    return { allowed: true };
  } catch (e) {
    console.warn('[AI RateLimit] Redis error:', e);
    return { allowed: true };
  }
}

export async function consumeAiTemplateQuota(tenantId: string): Promise<{ success: boolean; used: number; max: number; remaining: number }> {
  const quota = await getAiTemplateQuota(tenantId);
  if (quota.remainingQuota <= 0) {
    return { success: false, used: quota.usedRequests, max: quota.maxRequests, remaining: 0 };
  }

  const d = new Date();
  const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const redisKey = `quota:ai_templates:${tenantId}:${ym}`;
  let newUsed = quota.usedRequests + 1;

  if (connection && connection.status === 'ready') {
    try {
      newUsed = await connection.incr(redisKey);
      if (newUsed === 1) {
        await connection.expire(redisKey, 45 * 24 * 3600);
      }
    } catch (e) {
      console.warn('[AI Quota] Redis increment failed:', e);
    }
  }

  return {
    success: true,
    used: newUsed,
    max: quota.maxRequests,
    remaining: Math.max(0, quota.maxRequests - newUsed)
  };
}

export async function isFeatureAllowed(
  tenantId: string, 
  feature: 'scheduled_campaigns' | 'csv_export' | 'pause_resume' | 'custom_fields' | 'automation' | 'advanced_automation' | 'advanced_analytics' | 'ai_templates' | 'teams' | 'shared_team_inbox'
): Promise<boolean> {
  if (!db) return true;
  const { data: tenant } = await db.from('tenants').select('plan_type, subscription_status').eq('id', tenantId).single();
  const planType = (tenant as any)?.plan_type || 'starter';

  if (feature === 'scheduled_campaigns' || feature === 'csv_export' || feature === 'pause_resume' || feature === 'ai_templates') {
    return planType === 'growth' || planType === 'pro';
  }
  if (feature === 'custom_fields') {
    return planType === 'growth' || planType === 'pro';
  }
  if (feature === 'automation') {
    return planType === 'growth' || planType === 'pro';
  }
  if (feature === 'advanced_automation' || feature === 'teams' || feature === 'shared_team_inbox') {
    return planType === 'pro';
  }
  if (feature === 'advanced_analytics') {
    return planType === 'pro';
  }
  return true;
}

export async function incrementUsage(tenantId: string, type: 'campaigns', count: number = 1) {
  if (type === 'campaigns') {
    await incrementTemplateSendUsage(tenantId, count);
  }
}

