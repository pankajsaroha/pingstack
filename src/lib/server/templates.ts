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
    const keys = await connection.keys(`templates:${tenantId}:*`);
    if (keys && keys.length > 0) {
      await connection.del(...keys);
    }
    await connection.del(`templates:${tenantId}`);
  } catch (e) {
    console.error('[invalidateTemplatesCache] error:', e);
  }
}

async function fetchTemplatesServer(tenantId: string, onlyApproved = false): Promise<Template[]> {
  if (!tenantId || !db) return [];

  // Get connected WABA ID
  let wabaId = '';
  try {
    const { data: waAccount } = await db
      .from('whatsapp_accounts')
      .select('business_id')
      .eq('tenant_id', tenantId)
      .eq('provider', 'META')
      .maybeSingle();
    wabaId = waAccount?.business_id || '';
  } catch (e) {
    console.warn('[getTemplatesServer] WABA lookup error:', e);
  }

  const cacheKey = `templates:${tenantId}:${wabaId}:${onlyApproved ? 'approved' : 'all'}`;

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

    const allTenantTemplates = data || [];

    // Filter in-memory by WABA ID and approved status to ensure 100% database compatibility
    const result = allTenantTemplates.filter(t => {
      if (onlyApproved && t.status !== 'APPROVED') return false;
      const tplWabaId = t.waba_id || (t.metadata && typeof t.metadata === 'object' ? t.metadata.waba_id : null);
      if (wabaId && tplWabaId && tplWabaId !== wabaId) return false;
      return true;
    });

 

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
