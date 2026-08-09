import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { cache } from 'react';
import { Template } from '@/types';

const CACHE_TTL = 60; // 60 seconds

/**
 * Invalidates Redis template cache for a specific tenant
 */
export async function invalidateTemplatesCache(tenantId: string): Promise<void> {
  if (!connection || connection.status !== 'ready') return;
  try {
    await connection.del(`templates:${tenantId}`);
  } catch (e) {
    console.error('[invalidateTemplatesCache] error:', e);
  }
}

async function fetchTemplatesServer(tenantId: string): Promise<Template[]> {
  if (!tenantId || !db) return [];

  const cacheKey = `templates:${tenantId}`;

  // 1. Read from Redis Cache
  if (connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('[getTemplatesServer] Redis read failed:', e);
    }
  }

  try {
    const { data, error } = await db
      .from('templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getTemplatesServer] query failed:', error);
      return [];
    }

    const result = data || [];

    // 2. Write to Redis Cache
    if (connection && connection.status === 'ready') {
      try {
        await connection.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
      } catch (e) {
        console.error('[getTemplatesServer] Redis write failed:', e);
      }
    }

    return result;
  } catch (e) {
    console.error('[getTemplatesServer] unexpected error:', e);
    return [];
  }
}

// React cache() deduplicates repeated calls within a single request lifecycle
export const getTemplatesServer = cache(fetchTemplatesServer);
