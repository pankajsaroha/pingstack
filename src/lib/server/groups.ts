import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { cache } from 'react';
import { Group } from '@/types';

const CACHE_TTL = 60; // 60 seconds

/**
 * Invalidates Redis group cache for a specific tenant
 */
export async function invalidateGroupsCache(tenantId: string): Promise<void> {
  if (!connection || connection.status !== 'ready') return;
  try {
    await connection.del(`groups:${tenantId}`);
  } catch (e) {
    console.error('[invalidateGroupsCache] error:', e);
  }
}

async function fetchGroupsServer(tenantId: string): Promise<Group[]> {
  if (!tenantId || !db) return [];

  const cacheKey = `groups:${tenantId}`;

  // 1. Read from Redis Cache
  if (connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('[getGroupsServer] Redis read failed:', e);
    }
  }

  try {
    const { data, error } = await db
      .from('groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getGroupsServer] query failed:', error);
      return [];
    }

    const result = data || [];

    // 2. Write to Redis Cache
    if (connection && connection.status === 'ready') {
      try {
        await connection.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
      } catch (e) {
        console.error('[getGroupsServer] Redis write failed:', e);
      }
    }

    return result;
  } catch (e) {
    console.error('[getGroupsServer] unexpected error:', e);
    return [];
  }
}

// React cache() deduplicates repeated calls within a single request lifecycle
export const getGroupsServer = cache(fetchGroupsServer);
