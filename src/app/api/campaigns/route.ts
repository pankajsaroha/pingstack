import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { connection } from '@/lib/queue';
import { generatePublicId } from '@/lib/utils';

const PAGE_SIZE = 50;
const CACHE_TTL = 60; // seconds

type CreateCampaignBody = {
  name?: string;
  template_id?: string;
  scheduled_at?: string | null;
};

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') || String(PAGE_SIZE), 10));
    const offset = (page - 1) * pageSize;

    // Check Redis cache
    const cacheKey = `campaigns:${tenantId}:p${page}:ps${pageSize}`;
    if (connection && connection.status === 'ready') {
      try {
        const cached = await connection.get(cacheKey);
        if (cached) return NextResponse.json(JSON.parse(cached));
      } catch (e) {
        console.error('[Campaigns Cache] Redis read failed:', e);
      }
    }

    // 1. Fetch paginated campaigns (no messages yet)
    const { data: campaigns, error: cErr } = await db
      .from('campaigns')
      .select('*, templates(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    const list = campaigns || [];

    // 2. Fetch message status counts scoped ONLY to this page's campaign IDs
    //    — avoids loading the full tenant message history
    let statsMap: Record<string, Record<string, number>> = {};
    if (list.length > 0) {
      const campaignIds = list.map((c: any) => c.id);
      const { data: messages, error: mErr } = await db
        .from('messages')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds);   // ← scoped to current page only

      if (mErr) {
        console.error('[Campaigns List API] Failed to fetch message stats:', mErr);
      }

      (messages || []).forEach((m: any) => {
        const campId = m.campaign_id;
        if (!campId) return;
        if (!statsMap[campId]) statsMap[campId] = { sent: 0, delivered: 0, read: 0, failed: 0 };
        const status = m.status || 'unknown';
        statsMap[campId][status] = (statsMap[campId][status] || 0) + 1;
      });
    }

    // 3. Merge stats into campaign objects and compute accurate campaign status
    const result = list.map((c: any) => {
      const stats = statsMap[c.id] || { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      const pendingCount = stats.pending || 0;
      const failedCount = stats.failed || 0;
      const successCount = (stats.sent || 0) + (stats.delivered || 0) + (stats.read || 0);
      const totalMessages = pendingCount + failedCount + successCount;

      let computedStatus = c.status;

      // Compute status based on message execution results if not draft/scheduled
      if (c.status !== 'draft' && c.status !== 'scheduled') {
        if (pendingCount > 0) {
          computedStatus = 'running';
        } else if (totalMessages > 0) {
          if (failedCount === totalMessages) {
            // All messages failed!
            computedStatus = 'failed';
          } else if (failedCount > 0 && successCount > 0) {
            // Some messages sent/delivered and some failed!
            computedStatus = 'partial_success';
          } else if (successCount > 0 && failedCount === 0) {
            // All messages successfully sent/delivered!
            computedStatus = 'completed';
          }
        }
      }

      return {
        ...c,
        status: computedStatus,
        stats
      };
    });

    const payload = { data: result, page, pageSize, hasMore: list.length === pageSize };

    // Cache for 60 seconds
    if (connection && connection.status === 'ready') {
      try {
        await connection.set(cacheKey, JSON.stringify(payload), 'EX', CACHE_TTL);
      } catch (e) {
        console.error('[Campaigns Cache] Redis write failed:', e);
      }
    }

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('Campaigns GET handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  const { name, template_id, scheduled_at } = await req.json() as CreateCampaignBody;
  if (!name || !template_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const publicId = generatePublicId('c');
  const { data, error } = await db.from('campaigns')
    .insert({ tenant_id: tenantId, public_id: publicId, name, template_id, scheduled_at, status: 'draft' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Invalidate all campaign list cache pages for this tenant
  if (connection && connection.status === 'ready') {
    try {
      const keys = await connection.keys(`campaigns:${tenantId}:*`);
      if (keys.length > 0) await connection.del(...keys);
    } catch (e) {
      console.error('[Campaigns Cache] Failed to invalidate after POST:', e);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });

  try {
    const { id, deleteMessages } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });

    if (deleteMessages) {
      // Delete associated message records completely from DB
      await db.from('messages').delete().eq('campaign_id', id).eq('tenant_id', tenantId);
    } else {
      // Preserve individual contact chat history by unlinking campaign_id
      await db.from('messages').update({ campaign_id: null }).eq('campaign_id', id).eq('tenant_id', tenantId);
    }

    // Delete campaign record from history
    const { error } = await db.from('campaigns').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) throw error;

    // Invalidate Redis cache for this tenant
    if (connection && connection.status === 'ready') {
      try {
        const keys = await connection.keys(`campaigns:${tenantId}:*`);
        if (keys.length > 0) await connection.del(...keys);
      } catch (e) {
        console.error('[Campaigns Cache] Failed to invalidate after DELETE:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Campaign DELETE route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete campaign' }, { status: 500 });
  }
}
