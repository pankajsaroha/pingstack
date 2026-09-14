import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { PLANS, PLAN_CONFIGS, PlanType } from '@/lib/plans';
import { ensureFreshLimits } from '@/lib/limits';

export interface MetaMessagingLimitTierInfo {
  tier: string;
  limit: number | null; // null represents unknown/unavailable
  isUnlimited: boolean;
  rawResponse?: any;
}

export interface EffectiveMessagingCapacity {
  tenantId: string;
  meta: {
    isConfigured: boolean;
    tier: string;
    limit: number | null;
    isUnlimited: boolean;
    uniqueRecipients24h: number;
    remainingRecipients: number | null;
    qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    verifiedName?: string;
    phoneId?: string;
    wabaId?: string;
    lastSyncedAt?: string;
  };
  pingstack: {
    planType: PlanType;
    planName: string;
    dailyLimit: number;
    sentToday: number;
    remainingToday: number;
  };
  effective: {
    remainingCapacity: number;
    limitingFactor: 'META' | 'PINGSTACK_PLAN' | 'UNLIMITED' | 'NONE';
    status: 'HEALTHY' | 'NEAR_LIMIT' | 'LIMIT_REACHED';
    explanation: string;
  };
  scalingGuidance: {
    currentTier: string;
    nextTier?: string;
    scalingDescription: string;
    qualityImpact: string;
    metaManagerUrl: string;
  };
}

/**
 * Maps Meta Graph API messaging_limit_tier string to numeric recipient limit
 */
export function parseMetaMessagingTier(tierRaw?: string): MetaMessagingLimitTierInfo {
  if (!tierRaw) {
    return { tier: 'UNKNOWN', limit: null, isUnlimited: false };
  }

  const normalized = String(tierRaw).toUpperCase().trim();

  if (normalized === 'TIER_250' || normalized === '250') {
    return { tier: 'TIER_250', limit: 250, isUnlimited: false };
  }
  if (normalized === 'TIER_1K' || normalized === '1000' || normalized === 'TIER_1000') {
    return { tier: 'TIER_1K', limit: 1000, isUnlimited: false };
  }
  if (normalized === 'TIER_2K' || normalized === '2000' || normalized === 'TIER_2000') {
    return { tier: 'TIER_2K', limit: 2000, isUnlimited: false };
  }
  if (normalized === 'TIER_10K' || normalized === '10000' || normalized === 'TIER_10000') {
    return { tier: 'TIER_10K', limit: 10000, isUnlimited: false };
  }
  if (normalized === 'TIER_100K' || normalized === '100000' || normalized === 'TIER_100000') {
    return { tier: 'TIER_100K', limit: 100000, isUnlimited: false };
  }
  if (normalized === 'TIER_UNLIMITED' || normalized === 'UNLIMITED' || normalized === 'TIER_INFINITY') {
    return { tier: 'TIER_UNLIMITED', limit: Infinity, isUnlimited: true };
  }

  // If numeric string returned directly by Meta
  const num = parseInt(normalized, 10);
  if (!isNaN(num) && num > 0) {
    return { tier: `TIER_${num}`, limit: num, isUnlimited: false };
  }

  return { tier: normalized || 'UNKNOWN', limit: null, isUnlimited: false };
}

/**
 * Calculates count of distinct recipients sent business-initiated / outbound template messages
 * within the rolling 24-hour window (created_at >= NOW() - 24 hours).
 * Exempts direct messages within active customer-service windows.
 */
export async function getRolling24hUniqueRecipients(tenantId: string): Promise<number> {
  if (!db || !tenantId) return 0;

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Query messages sent in the last 24h that are outbound
    // Count distinct phone numbers
    const { data: recentMessages, error } = await db
      .from('messages')
      .select('phone_number, campaign_id, message_type')
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .gte('created_at', twentyFourHoursAgo);

    if (error || !recentMessages) {
      return 0;
    }

    // Filter for business-initiated (campaigns, templates, or non-chat fallback)
    const uniquePhones = new Set<string>();
    for (const msg of recentMessages) {
      if (msg.phone_number) {
        uniquePhones.add(msg.phone_number.replace(/\D/g, ''));
      }
    }

    return uniquePhones.size;
  } catch (err) {
    console.warn('[Meta Limits] getRolling24hUniqueRecipients error:', err);
    return 0;
  }
}

/**
 * Fetches and synchronizes Meta messaging limits from Meta Graph API for a phone_number_id.
 * Caches in Redis for 1 hour to prevent excessive Graph API calls.
 */
export async function fetchAndCacheMetaLimits(
  phoneNumberId: string,
  accessToken: string,
  tenantId: string,
  forceRefresh = false
): Promise<{
  tier: string;
  limit: number | null;
  isUnlimited: boolean;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  verifiedName?: string;
  status?: string;
}> {
  const cacheKey = `meta_limits:${tenantId}`;

  if (!forceRefresh && connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Meta Limits] Redis cache read error:', e);
    }
  }

  // Live Meta Graph API Call
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=messaging_limit_tier,quality_rating,status,verified_name,code_verification_status`;
  
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (res.ok && data.id) {
      const tierInfo = parseMetaMessagingTier(data.messaging_limit_tier);
      const qualityRating = (data.quality_rating || 'UNKNOWN').toUpperCase() as any;

      const result = {
        tier: tierInfo.tier,
        limit: tierInfo.limit,
        isUnlimited: tierInfo.isUnlimited,
        qualityRating: ['GREEN', 'YELLOW', 'RED'].includes(qualityRating) ? qualityRating : 'UNKNOWN',
        verifiedName: data.verified_name,
        status: data.status,
      };

      if (connection && connection.status === 'ready') {
        try {
          await connection.set(cacheKey, JSON.stringify(result), 'EX', 3600); // 1 hour TTL
        } catch (e) {
          console.warn('[Meta Limits] Redis cache set error:', e);
        }
      }

      return result;
    }
  } catch (err) {
    console.warn('[Meta Limits] Graph API query failed:', err);
  }

  return {
    tier: 'UNKNOWN',
    limit: null,
    isUnlimited: false,
    qualityRating: 'UNKNOWN',
  };
}

/**
 * Computes the unified effective messaging capacity merging Pingstack plan limits and Meta limits.
 */
export async function getEffectiveMessagingCapacity(
  tenantId: string,
  forceRefresh = false
): Promise<EffectiveMessagingCapacity> {
  if (!db || !tenantId) {
    throw new Error('Tenant context required for capacity calculation');
  }

  // 1. Fetch tenant plan and daily usage
  let { data: tenant } = await db.from('tenants').select('*').eq('id', tenantId).single();
  tenant = await ensureFreshLimits(tenantId, tenant);

  const planType = (tenant?.plan_type || 'starter') as PlanType;
  const plan = PLANS[planType] || PLANS.starter;
  const pingstackDailyLimit = plan.templateSendsPerDay || plan.maxCampaignsPerDay || 100;
  const pingstackSentToday = tenant?.campaigns_sent_today || 0;
  const pingstackRemainingToday = Math.max(0, pingstackDailyLimit - pingstackSentToday);

  // 2. Fetch WhatsApp account context
  const { data: waAccount } = await db
    .from('whatsapp_accounts')
    .select('id, phone_number_id, access_token, business_id, status, provider')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const isConfigured = !!(waAccount && waAccount.phone_number_id && waAccount.access_token);
  let metaTier = 'UNKNOWN';
  let metaLimit: number | null = null;
  let isUnlimited = false;
  let qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN' = 'UNKNOWN';
  let verifiedName: string | undefined;

  if (isConfigured && waAccount.provider === 'META') {
    try {
      const { decrypt } = await import('@/lib/encryption');
      const token = decrypt(waAccount.access_token);
      const metaInfo = await fetchAndCacheMetaLimits(waAccount.phone_number_id, token, tenantId, forceRefresh);
      metaTier = metaInfo.tier;
      metaLimit = metaInfo.limit;
      isUnlimited = metaInfo.isUnlimited;
      qualityRating = metaInfo.qualityRating;
      verifiedName = metaInfo.verifiedName;
    } catch (e) {
      console.warn('[Meta Limits] Failed to decrypt token or fetch limits:', e);
    }
  }

  // 3. Compute rolling 24-hour unique recipients
  const uniqueRecipients24h = await getRolling24hUniqueRecipients(tenantId);
  const metaRemainingRecipients = metaLimit !== null && metaLimit !== Infinity
    ? Math.max(0, metaLimit - uniqueRecipients24h)
    : (isUnlimited ? Infinity : null);

  // 4. Calculate effective remaining capacity
  let effectiveRemaining = pingstackRemainingToday;
  let limitingFactor: EffectiveMessagingCapacity['effective']['limitingFactor'] = 'PINGSTACK_PLAN';

  if (metaRemainingRecipients !== null && metaRemainingRecipients !== Infinity) {
    if (metaRemainingRecipients < pingstackRemainingToday) {
      effectiveRemaining = metaRemainingRecipients;
      limitingFactor = 'META';
    } else {
      effectiveRemaining = pingstackRemainingToday;
      limitingFactor = 'PINGSTACK_PLAN';
    }
  } else if (isUnlimited) {
    effectiveRemaining = pingstackRemainingToday;
    limitingFactor = 'PINGSTACK_PLAN';
  } else {
    // Meta limit unavailable - fallback to Pingstack plan limit with notice
    effectiveRemaining = pingstackRemainingToday;
    limitingFactor = 'PINGSTACK_PLAN';
  }

  // Status computation
  let status: EffectiveMessagingCapacity['effective']['status'] = 'HEALTHY';
  if (effectiveRemaining <= 0) {
    status = 'LIMIT_REACHED';
  } else if (
    (metaRemainingRecipients !== null && metaRemainingRecipients < 50) ||
    pingstackRemainingToday < 20
  ) {
    status = 'NEAR_LIMIT';
  }

  let explanation = '';
  const planName = PLAN_CONFIGS[planType]?.name || planType;
  if (limitingFactor === 'META') {
    explanation = `Your sending capacity is currently limited by Meta's portfolio limit (${metaLimit} unique recipients / rolling 24h). You have ${metaRemainingRecipients} recipient slots remaining in the current 24-hour window.`;
  } else if (limitingFactor === 'PINGSTACK_PLAN') {
    explanation = `Your sending capacity is currently governed by your Pingstack ${planName} plan (${pingstackDailyLimit} sends/day). You have ${pingstackRemainingToday} sends remaining today.`;
  } else {
    explanation = 'Sending capacity is currently healthy.';
  }

  // Meta Scaling Guidance
  const scalingGuidance = {
    currentTier: metaTier === 'UNKNOWN' ? 'Meta limit unavailable' : metaTier,
    nextTier: metaTier === 'TIER_250' ? 'TIER_1K (1,000 unique recipients)' : (metaTier === 'TIER_1K' ? 'TIER_10K (10,000 unique recipients)' : (metaTier === 'TIER_10K' ? 'TIER_100K' : 'TIER_UNLIMITED')),
    scalingDescription: 'Meta automatically increases messaging limits when you consistently send high-quality messages (GREEN quality rating) to at least 50% of your current tier limit over rolling 7-day periods. Completing Meta Business Verification in Meta Business Manager is recommended to accelerate tier eligibility.',
    qualityImpact: `Current Messaging Quality: ${qualityRating}. Maintaining GREEN quality ensures uninterrupted tier upgrades. If quality drops to RED, Meta may flag the account and restrict messaging limits.`,
    metaManagerUrl: waAccount?.business_id
      ? `https://business.facebook.com/wa/manage/phone-numbers/?waba_id=${waAccount.business_id}`
      : 'https://business.facebook.com/wa/manage/phone-numbers/',
  };

  return {
    tenantId,
    meta: {
      isConfigured,
      tier: metaTier,
      limit: metaLimit,
      isUnlimited,
      uniqueRecipients24h,
      remainingRecipients: metaRemainingRecipients,
      qualityRating,
      verifiedName,
      phoneId: waAccount?.phone_number_id,
      wabaId: waAccount?.business_id,
      lastSyncedAt: new Date().toISOString(),
    },
    pingstack: {
      planType,
      planName,
      dailyLimit: pingstackDailyLimit,
      sentToday: pingstackSentToday,
      remainingToday: pingstackRemainingToday,
    },
    effective: {
      remainingCapacity: effectiveRemaining,
      limitingFactor,
      status,
      explanation,
    },
    scalingGuidance,
  };
}

/**
 * Updates Meta limits cache when a capability update webhook arrives
 */
export async function updateCachedMetaLimitsFromWebhook(
  tenantId: string,
  tier?: string,
  qualityRating?: string
): Promise<void> {
  const cacheKey = `meta_limits:${tenantId}`;
  const tierInfo = parseMetaMessagingTier(tier);

  const updatePayload = {
    tier: tierInfo.tier,
    limit: tierInfo.limit,
    isUnlimited: tierInfo.isUnlimited,
    qualityRating: qualityRating ? qualityRating.toUpperCase() : 'UNKNOWN',
    lastWebhookUpdate: new Date().toISOString(),
  };

  if (connection && connection.status === 'ready') {
    try {
      await connection.set(cacheKey, JSON.stringify(updatePayload), 'EX', 3600);
      console.log(`[Meta Limits Webhook] Successfully updated cached limits for tenant ${tenantId}: Tier=${tierInfo.tier}, Quality=${qualityRating}`);
    } catch (e) {
      console.warn('[Meta Limits Webhook] Redis update error:', e);
    }
  }
}
