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
    const [groupsRes, groupContactsRes] = await Promise.all([
      db.from('groups').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      db.from('group_contacts').select('group_id').eq('tenant_id', tenantId)
    ]);

    if (groupsRes.error) {
      console.error('[getGroupsServer] query failed:', groupsRes.error);
      return [];
    }

    const countMap = new Map<string, number>();
    (groupContactsRes.data || []).forEach((gc: any) => {
      countMap.set(gc.group_id, (countMap.get(gc.group_id) || 0) + 1);
    });

    const result = (groupsRes.data || []).map((g: any) => ({
      ...g,
      contacts_count: countMap.get(g.id) || 0
    }));

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
