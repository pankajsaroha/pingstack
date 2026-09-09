import { createHash } from 'crypto';
import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';

export function hashRequestBody(body: any): string {
  if (!body) return '';
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  return createHash('sha256').update(str).digest('hex');
}

export interface CachedIdempotencyResponse {
  statusCode: number;
  responseBody: any;
}

/**
 * Checks if an idempotent request was already processed for this tenant.
 * Uses Redis first (fast ~1ms), then falls back to Supabase idempotency_keys table.
 */
export async function getCachedIdempotentResponse(
  tenantId: string,
  idempotencyKey: string,
  requestHash: string
): Promise<{ exists: boolean; mismatch?: boolean; cachedResponse?: CachedIdempotencyResponse }> {
  if (!tenantId || !idempotencyKey) return { exists: false };

  const redisKey = `idempotency:${tenantId}:${idempotencyKey}`;

  // 1. Check Redis Cache
  if (connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(redisKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.requestHash && parsed.requestHash !== requestHash) {
          return { exists: true, mismatch: true };
        }
        return {
          exists: true,
          cachedResponse: {
            statusCode: parsed.statusCode,
            responseBody: parsed.responseBody,
          }
        };
      }
    } catch (e) {
      console.warn('[Idempotency] Redis read error:', e);
    }
  }

  // 2. Check Database Table
  if (db) {
    try {
      const { data, error } = await db
        .from('idempotency_keys')
        .select('request_hash, response_code, response_body, expires_at')
        .eq('tenant_id', tenantId)
        .eq('key', idempotencyKey)
        .maybeSingle();

      if (!error && data) {
        const isExpired = new Date(data.expires_at).getTime() < Date.now();
        if (!isExpired) {
          if (data.request_hash !== requestHash) {
            return { exists: true, mismatch: true };
          }
          return {
            exists: true,
            cachedResponse: {
              statusCode: data.response_code,
              responseBody: data.response_body,
            }
          };
        }
      }
    } catch (dbErr) {
      console.warn('[Idempotency] DB lookup warning:', dbErr);
    }
  }

  return { exists: false };
}

/**
 * Stores the response for an idempotency key with 24 hours TTL.
 */
export async function storeIdempotentResponse(
  tenantId: string,
  idempotencyKey: string,
  requestHash: string,
  statusCode: number,
  responseBody: any
): Promise<void> {
  if (!tenantId || !idempotencyKey) return;

  const redisKey = `idempotency:${tenantId}:${idempotencyKey}`;
  const payload = {
    requestHash,
    statusCode,
    responseBody,
  };

  // 1. Write to Redis (24 hour TTL)
  if (connection && connection.status === 'ready') {
    try {
      await connection.set(redisKey, JSON.stringify(payload), 'EX', 86400);
    } catch (e) {
      console.warn('[Idempotency] Redis write warning:', e);
    }
  }

  // 2. Write to Database Table
  if (db) {
    try {
      const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();
      await db.from('idempotency_keys').upsert({
        tenant_id: tenantId,
        key: idempotencyKey,
        request_hash: requestHash,
        response_code: statusCode,
        response_body: responseBody,
        expires_at: expiresAt
      }, { onConflict: 'tenant_id,key' });
    } catch (dbErr) {
      // Non-blocking log
      console.warn('[Idempotency] DB upsert warning:', dbErr);
    }
  }
}
