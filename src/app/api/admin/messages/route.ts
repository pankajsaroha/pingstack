import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d'; // 'today' | '7d' | '30d' | '90d' | 'all'
    const sort = searchParams.get('sort') || 'sent'; // 'sent' | 'delivered' | 'failed' | 'rate'

    const now = new Date();
    let startDate: Date | null = null;
    let daysCount = 7;

    if (range === 'today') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      daysCount = 1;
    } else if (range === '7d') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
      daysCount = 7;
    } else if (range === '30d') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
      daysCount = 30;
    } else if (range === '90d') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89));
      daysCount = 90;
    }

    // Build messages query
    let msgQuery = db.from('messages').select('id, tenant_id, status, error, created_at, message_type');
    if (startDate) {
      msgQuery = msgQuery.gte('created_at', startDate.toISOString());
    }

    const [messagesRes, tenantsRes, campaignsRes] = await Promise.all([
      msgQuery,
      db.from('tenants').select('id, public_id, name, plan_type'),
      db.from('campaigns').select('id, tenant_id, status'),
    ]);

    const messages = messagesRes.data || [];
    const tenants = tenantsRes.data || [];
    const campaigns = campaignsRes.data || [];

    // Aggregated Metrics
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalFailed = 0;

    // Time-series Chart Data
    const timeMap: Record<string, { date: string; sent: number; delivered: number; read: number; failed: number }> = {};
    
    if (range === 'today') {
      // 24-hour buckets
      for (let h = 0; h < 24; h++) {
        const hourKey = `${h.toString().padStart(2, '0')}:00`;
        timeMap[hourKey] = { date: hourKey, sent: 0, delivered: 0, read: 0, failed: 0 };
      }
    } else {
      // Daily buckets
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timeMap[key] = { date: label, sent: 0, delivered: 0, read: 0, failed: 0 };
      }
    }

    // Business aggregation
    const businessMap = new Map<string, {
      tenantId: string;
      name: string;
      planType: string;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
      activeCampaigns: number;
    }>();

    tenants.forEach((t: any) => {
      businessMap.set(t.id, {
        tenantId: t.id,
        name: t.name,
        planType: t.plan_type || 'starter',
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        activeCampaigns: 0,
      });
    });

    campaigns.forEach((c: any) => {
      if (c.tenant_id && (c.status === 'running' || c.status === 'scheduled') && businessMap.has(c.tenant_id)) {
        businessMap.get(c.tenant_id)!.activeCampaigns += 1;
      }
    });

    messages.forEach((m: any) => {
      totalSent += 1;
      const isDelivered = m.status === 'delivered' || m.status === 'read';
      const isRead = m.status === 'read';
      const isFailed = m.status === 'failed';

      if (isDelivered) totalDelivered += 1;
      if (isRead) totalRead += 1;
      if (isFailed) totalFailed += 1;

      // Bucket time series
      if (m.created_at) {
        if (range === 'today') {
          const d = new Date(m.created_at);
          const hourKey = `${d.getUTCHours().toString().padStart(2, '0')}:00`;
          if (timeMap[hourKey]) {
            timeMap[hourKey].sent += 1;
            if (isDelivered) timeMap[hourKey].delivered += 1;
            if (isRead) timeMap[hourKey].read += 1;
            if (isFailed) timeMap[hourKey].failed += 1;
          }
        } else {
          const dateKey = m.created_at.split('T')[0];
          if (timeMap[dateKey]) {
            timeMap[dateKey].sent += 1;
            if (isDelivered) timeMap[dateKey].delivered += 1;
            if (isRead) timeMap[dateKey].read += 1;
            if (isFailed) timeMap[dateKey].failed += 1;
          }
        }
      }

      // Bucket by business
      if (m.tenant_id && businessMap.has(m.tenant_id)) {
        const b = businessMap.get(m.tenant_id)!;
        b.sent += 1;
        if (isDelivered) b.delivered += 1;
        if (isRead) b.read += 1;
        if (isFailed) b.failed += 1;
      }
    });

    const deliveryRate = totalSent > 0 ? Number(((totalDelivered / totalSent) * 100).toFixed(1)) : 100;
    const readRate = totalSent > 0 ? Number(((totalRead / totalSent) * 100).toFixed(1)) : 0;
    const failureRate = totalSent > 0 ? Number(((totalFailed / totalSent) * 100).toFixed(1)) : 0;

    let businessList = Array.from(businessMap.values()).map((b) => {
      const bDeliveryRate = b.sent > 0 ? Number(((b.delivered / b.sent) * 100).toFixed(1)) : 100;
      const bReadRate = b.sent > 0 ? Number(((b.read / b.sent) * 100).toFixed(1)) : 0;
      const bFailRate = b.sent > 0 ? Number(((b.failed / b.sent) * 100).toFixed(1)) : 0;
      return {
        ...b,
        deliveryRate: bDeliveryRate,
        readRate: bReadRate,
        failureRate: bFailRate,
      };
    });

    // Sort businesses
    if (sort === 'delivered') {
      businessList.sort((a, b) => b.delivered - a.delivered);
    } else if (sort === 'failed') {
      businessList.sort((a, b) => b.failed - a.failed);
    } else if (sort === 'rate') {
      businessList.sort((a, b) => b.deliveryRate - a.deliveryRate);
    } else {
      businessList.sort((a, b) => b.sent - a.sent);
    }

    return NextResponse.json({
      metrics: {
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveryRate,
        readRate,
        failureRate,
      },
      chartData: Object.values(timeMap),
      businesses: businessList,
      range,
    });
  } catch (err: any) {
    console.error('[Admin Messages API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch messages analytics' }, { status: 500 });
  }
}
