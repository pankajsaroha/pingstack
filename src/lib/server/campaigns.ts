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

    // 2. Fetch message stats scoped only to this page's campaign IDs
    let statsMap: Record<string, Record<string, number>> = {};
    if (list.length > 0) {
      const campaignIds = list.map((c: any) => c.id);
      const { data: messages, error: mErr } = await db
        .from('messages')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds); // ← scoped to current page only

      if (mErr) {
        console.error('[getCampaignsServer] messages query failed:', mErr);
      }

      (messages || []).forEach((m: any) => {
        const campId = m.campaign_id;
        if (!campId) return;
        if (!statsMap[campId]) statsMap[campId] = { sent: 0, delivered: 0, read: 0, failed: 0 };
        const status = m.status || 'unknown';
        statsMap[campId][status] = (statsMap[campId][status] || 0) + 1;
      });
    }

    const result = list.map((c: any) => ({
      ...c,
      stats: statsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 }
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
