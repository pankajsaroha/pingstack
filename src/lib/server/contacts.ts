import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { cache } from 'react';
import { Contact } from '@/types';

const CACHE_TTL = 60; // 60 seconds
const DEFAULT_LIMIT = 50; // Default ceiling to prevent unbounded full-table scans

/**
 * Invalidates Redis contact caches for a specific tenant
 */
export async function invalidateContactsCache(tenantId: string): Promise<void> {
  if (!connection || connection.status !== 'ready') return;
  try {
    const keys = await connection.keys(`contacts:${tenantId}:*`);
    if (keys.length > 0) {
      await connection.del(...keys);
    }
  } catch (e) {
    console.error('[invalidateContactsCache] error:', e);
  }
}

export async function fetchContactsServer(tenantId: string, limit?: number, page: number = 1): Promise<any> {
  if (!tenantId || !db) return limit ? { contacts: [], totalCount: 0 } : [];

  const actualLimit = limit || DEFAULT_LIMIT;
  const offset = (page - 1) * actualLimit;
  const cacheKey = `contacts:${tenantId}:p${page}:l${actualLimit}`;

  // 1. Read from Redis Cache
  if (connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('[getContactsServer] Redis read failed:', e);
    }
  }

  try {
    // DB-level pagination: range(offset, offset + actualLimit - 1)
    const { data, error, count } = await db
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + actualLimit - 1);

    if (error) {
      console.error('[getContactsServer] query failed:', error);
      return limit ? { contacts: [], totalCount: 0 } : [];
    }

    const result = limit
      ? { contacts: data || [], totalCount: count || 0 }
      : (data || []);

    // 2. Write to Redis Cache
    if (connection && connection.status === 'ready') {
      try {
        await connection.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
      } catch (e) {
        console.error('[getContactsServer] Redis write failed:', e);
      }
    }

    return result;
  } catch (e) {
    console.error('[getContactsServer] unexpected error:', e);
    return limit ? { contacts: [], totalCount: 0 } : [];
  }
}

// React cache() deduplicates repeated calls within a single request lifecycle
export const getContactsServer = cache(fetchContactsServer) as typeof fetchContactsServer;
