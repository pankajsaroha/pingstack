import { connection } from './queue';
import { db } from './db';
import { PlanType, getActivePlanType } from './plans';
import { NextResponse } from 'next/server';

export type RateLimitCategory = 'send_message' | 'template_ops' | 'read_list' | 'file_upload';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  burst?: number;
  refillRate?: number;
}

const LIMITS: Record<PlanType, Record<RateLimitCategory, RateLimitConfig>> = {
  starter: {
    send_message: { limit: 10, windowMs: 1000, burst: 10, refillRate: 2 },
    template_ops: { limit: 10, windowMs: 60000 },
    read_list: { limit: 60, windowMs: 60000 },
    file_upload: { limit: 10, windowMs: 60000 },
  },
  growth: {
    send_message: { limit: 25, windowMs: 1000, burst: 25, refillRate: 5 },
    template_ops: { limit: 30, windowMs: 60000 },
    read_list: { limit: 180, windowMs: 60000 },
    file_upload: { limit: 30, windowMs: 60000 },
  },
  pro: {
    send_message: { limit: 50, windowMs: 1000, burst: 50, refillRate: 10 },
    template_ops: { limit: 60, windowMs: 60000 },
    read_list: { limit: 600, windowMs: 60000 },
    file_upload: { limit: 60, windowMs: 60000 },
  }
};

/**
 * Resolves a tenant's active plan, caching the result in Redis for 5 minutes
 */
export async function getTenantPlan(tenantId: string): Promise<PlanType> {
  if (!connection) return 'starter';
  const cacheKey = `tenant_plan:${tenantId}`;
  
  try {
    const cached = await connection.get(cacheKey);
    if (cached) return cached as PlanType;
  } catch (e) {
    console.error('[Rate Limit] Redis get plan cache error:', e);
  }

  if (!db) return 'starter';

  try {
    const { data } = await db
      .from('tenants')
      .select('plan_type')
      .eq('id', tenantId)
      .maybeSingle();

    const plan = getActivePlanType(data?.plan_type);
    
    try {
      await connection.set(cacheKey, plan, 'EX', 300);
    } catch (e) {
      console.error('[Rate Limit] Redis set plan cache error:', e);
    }
    
    return plan;
  } catch (err) {
    console.error('[Rate Limit] DB fetch plan error:', err);
    return 'starter';
  }
}

/**
 * Checks if a tenant exceeds the rate limit for a specific category.
 * Returns success, remaining tokens/requests, limit and reset timestamp.
 */
export async function checkRateLimit(
  tenantId: string,
  category: RateLimitCategory
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!connection) {
    return { success: true, limit: 0, remaining: 0, reset: Date.now() };
  }

  const plan = await getTenantPlan(tenantId);
  const config = LIMITS[plan][category];
  const now = Date.now();

  if (category === 'send_message') {
    // 1. Token Bucket Rate Limiting (Burst Limits)
    const key = `ratelimit:${tenantId}:${category}`;
    const capacity = config.burst || 10;
    const refillRate = config.refillRate || 2;

    try {
      const data = await connection.hmget(key, 'tokens', 'lastRefillTime');
      let tokens = data[0] ? parseFloat(data[0]) : capacity;
      let lastRefillTime = data[1] ? parseInt(data[1], 10) : now;

      // Add refilled tokens
      const elapsedSeconds = Math.max(0, (now - lastRefillTime) / 1000);
      tokens = Math.min(capacity, tokens + elapsedSeconds * refillRate);
      lastRefillTime = now;

      let success = false;
      if (tokens >= 1) {
        tokens -= 1;
        success = true;
      }

      const pipeline = connection.pipeline();
      pipeline.hset(key, {
        tokens: tokens.toString(),
        lastRefillTime: lastRefillTime.toString()
      });
      pipeline.expire(key, Math.ceil(capacity / refillRate) + 60);
      await pipeline.exec();

      return {
        success,
        limit: capacity,
        remaining: Math.floor(tokens),
        reset: now + (success ? 0 : Math.ceil((1 / refillRate) * 1000))
      };
    } catch (err) {
      console.error('[Rate Limit] Token bucket check failed, bypassing:', err);
      return { success: true, limit: capacity, remaining: capacity, reset: now };
    }
  } else {
    // 2. Sliding Window Log Rate Limiting
    const key = `ratelimit:${tenantId}:${category}`;
    const limit = config.limit;
    const windowMs = config.windowMs;
    const clearBefore = now - windowMs;
    const member = `${now}:${Math.random().toString(36).substring(2, 7)}`;

    try {
      const pipeline = connection.pipeline();
      pipeline.zremrangebyscore(key, 0, clearBefore);
      pipeline.zadd(key, now, member);
      pipeline.zcard(key);
      pipeline.pexpire(key, Math.ceil(windowMs / 1000) + 5);

      const results = await pipeline.exec();
      if (!results) {
        return { success: true, limit, remaining: limit, reset: now + windowMs };
      }

      const currentCount = (results[2][1] as number) || 0;
      const success = currentCount <= limit;
      const remaining = Math.max(0, limit - currentCount);
      const reset = now + windowMs;

      if (!success) {
        await connection.zrem(key, member);
      }

      return { success, limit, remaining, reset };
    } catch (err) {
      console.error('[Rate Limit] Sliding window check failed, bypassing:', err);
      return { success: true, limit, remaining: limit, reset: now + windowMs };
    }
  }
}

/**
 * Standard Next.js route rate-limiting enforcer.
 * Returns { limited: true, response: NextResponse } if limited, or { limited: false }.
 */
export async function enforceRateLimit(
  tenantId: string,
  category: RateLimitCategory
): Promise<{ limited: boolean; response?: NextResponse }> {
  const check = await checkRateLimit(tenantId, category);
  
  if (!check.success) {
    const errorResponse = NextResponse.json(
      { error: `API rate limit exceeded for category '${category}'. Please try again in a moment.` },
      { 
        status: 429, 
        headers: {
          'Retry-After': Math.ceil((check.reset - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': check.limit.toString(),
          'X-RateLimit-Remaining': check.remaining.toString(),
          'X-RateLimit-Reset': check.reset.toString(),
        }
      }
    );
    return { limited: true, response: errorResponse };
  }
  
  return { limited: false };
}
