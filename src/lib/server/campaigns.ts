import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';

const PAGE_SIZE = 50;
const CACHE_TTL = 60; // seconds

export async function getCampaignsServer(tenantId: string, page = 1, pageSize = PAGE_SIZE) {
  if (!tenantId || !db) return [];

  const offset = (page - 1) * pageSize;
  const cacheKey = `campaigns:${tenantId}:p${page}:ps${pageSize}`;

  // Check Redis cache
  if (connection && connection.status === 'ready') {
    try {
      const cached = await connection.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // getCampaignsServer callers expect a flat array; handle both shapes
        return Array.isArray(parsed) ? parsed : (parsed.data || []);
      }
    } catch (e) {
      console.error('[getCampaignsServer] Redis read failed:', e);
    }
  }

  try {
    // 1. Fetch paginated campaigns
    const { data: campaigns, error: cErr } = await db
      .from('campaigns')
      .select('*, templates(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (cErr) {
      console.error('[getCampaignsServer] campaign query failed:', cErr);
      return [];
    }

    const list = campaigns || [];

    // 2. Fetch message status counts scoped ONLY to this page's campaign IDs
    //    Chunked pagination avoids the Supabase / PostgREST default 1,000-row query ceiling
    let statsMap: Record<string, { total: number; sent: number; delivered: number; read: number; failed: number; pending: number; raw: Record<string, number> }> = {};
    if (list.length > 0) {
      const campaignIds = list.map((c: any) => c.id);
      let allMessages: Array<{ campaign_id: string; status: string | null }> = [];
      let from = 0;
      const CHUNK_SIZE = 1000;

      while (true) {
        const { data: chunk, error: mErr } = await db
          .from('messages')
          .select('campaign_id, status')
          .eq('tenant_id', tenantId)
          .in('campaign_id', campaignIds)
          .range(from, from + CHUNK_SIZE - 1);

        if (mErr) {
          console.error('[getCampaignsServer] messages query failed:', mErr);
          break;
        }
        if (!chunk || chunk.length === 0) break;
        allMessages.push(...chunk);
        if (chunk.length < CHUNK_SIZE) break;
        from += CHUNK_SIZE;
      }

      const rawCounts: Record<string, Record<string, number>> = {};
      allMessages.forEach((m: any) => {
        const campId = m.campaign_id;
        if (!campId) return;
        if (!rawCounts[campId]) {
          rawCounts[campId] = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
        }
        const status = m.status || 'unknown';
        rawCounts[campId][status] = (rawCounts[campId][status] || 0) + 1;
      });

      // Calculate funnel metrics conforming to WhatsApp delivery semantics:
      // - Sent: all messages accepted by WhatsApp Cloud API (sent + delivered + read)
      // - Delivered: confirmed reached recipient device (delivered + read)
      // - Read: confirmed opened/read by recipient (read)
      // - Failed: delivery failure or rejection (failed)
      // - Total: all recipient message logs (pending + sent + delivered + read + failed)
      campaignIds.forEach((campId: string) => {
        const raw = rawCounts[campId] || { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
        const rawPending = raw.pending || 0;
        const rawSent = raw.sent || 0;
        const rawDelivered = raw.delivered || 0;
        const rawRead = raw.read || 0;
        const rawFailed = raw.failed || 0;

        statsMap[campId] = {
          total: rawPending + rawSent + rawDelivered + rawRead + rawFailed,
          sent: rawSent + rawDelivered + rawRead,
          delivered: rawDelivered + rawRead,
          read: rawRead,
          failed: rawFailed,
          pending: rawPending,
          raw
        };
      });
    }

    const result = list.map((c: any) => ({
      ...c,
      stats: statsMap[c.id] || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0, raw: { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 } }
    }));

    // Cache for 60 seconds
    if (connection && connection.status === 'ready') {
      try {
        await connection.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);
      } catch (e) {
        console.error('[getCampaignsServer] Redis write failed:', e);
      }
    }

    return result;
  } catch (err) {
    console.error('[getCampaignsServer] unexpected error:', err);
    return [];
  }
}

/**
 * Invalidates Redis cached campaigns for a tenant
 */
export async function invalidateCampaignsCache(tenantId: string): Promise<void> {
  if (!tenantId || !connection || connection.status !== 'ready') return;
  try {
    const keys = await connection.keys(`campaigns:${tenantId}:*`);
    if (keys && keys.length > 0) {
      await connection.del(...keys);
    }
  } catch (err) {
    console.error('[invalidateCampaignsCache] Redis del failed:', err);
  }
}
