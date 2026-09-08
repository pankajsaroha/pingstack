import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isFeatureAllowed } from '@/lib/limits';

export async function GET(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    // 1. Authorize Pro plan access
    const allowed = await isFeatureAllowed(tenantId, 'advanced_analytics');
    if (!allowed) {
      return NextResponse.json({
        error: 'Advanced Analytics & Reporting is a Pro-exclusive feature. Please upgrade to Pro for deep messaging analytics.',
        code: 'PRO_REQUIRED'
      }, { status: 403 });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';
    const isCsvExport = url.searchParams.get('export') === 'csv';

    // Calculate start date
    let days = 30;
    if (range === '7d') days = 7;
    if (range === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startIso = startDate.toISOString();

    // 2. Fetch messages in date range for this tenant
    // Fetch in chunks of 1000 to prevent payload limits
    let messages: any[] = [];
    let from = 0;
    const CHUNK_SIZE = 1000;

    while (true) {
      const { data: chunk, error: mErr } = await db
        .from('messages')
        .select('id, direction, status, created_at, campaign_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', startIso)
        .order('created_at', { ascending: false })
        .range(from, from + CHUNK_SIZE - 1);

      if (mErr) throw mErr;
      if (!chunk || chunk.length === 0) break;
      messages.push(...chunk);
      if (chunk.length < CHUNK_SIZE) break;
      from += CHUNK_SIZE;
    }

    // 3. Fetch campaigns for comparative analysis
    const { data: campaigns } = await db
      .from('campaigns')
      .select('id, name, created_at, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', startIso);

    // 4. Compute High-Level Metrics
    let sentCount = 0;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;
    let inboundCount = 0;

    // Date-wise map: 'YYYY-MM-DD' -> { sent, delivered, read, failed, inbound }
    const timeSeriesMap: Record<string, { date: string; sent: number; delivered: number; read: number; failed: number; inbound: number }> = {};

    // Hourly distribution: 0..23 -> count
    const hourlyDistribution: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyDistribution[h] = 0;

    // Campaign stats map: campaign_id -> { sent, delivered, read, failed }
    const campaignStatsMap: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};

    messages.forEach((msg) => {
      const dateKey = msg.created_at ? msg.created_at.slice(0, 10) : 'Unknown';
      if (!timeSeriesMap[dateKey]) {
        timeSeriesMap[dateKey] = { date: dateKey, sent: 0, delivered: 0, read: 0, failed: 0, inbound: 0 };
      }

      const msgHour = msg.created_at ? new Date(msg.created_at).getHours() : 0;
      hourlyDistribution[msgHour] = (hourlyDistribution[msgHour] || 0) + 1;

      if (msg.direction === 'inbound') {
        inboundCount++;
        timeSeriesMap[dateKey].inbound++;
      } else {
        // Outbound
        sentCount++;
        timeSeriesMap[dateKey].sent++;

        if (msg.status === 'delivered') {
          deliveredCount++;
          timeSeriesMap[dateKey].delivered++;
        } else if (msg.status === 'read') {
          deliveredCount++;
          readCount++;
          timeSeriesMap[dateKey].delivered++;
          timeSeriesMap[dateKey].read++;
        } else if (msg.status === 'failed') {
          failedCount++;
          timeSeriesMap[dateKey].failed++;
        }

        if (msg.campaign_id) {
          if (!campaignStatsMap[msg.campaign_id]) {
            campaignStatsMap[msg.campaign_id] = { sent: 0, delivered: 0, read: 0, failed: 0 };
          }
          campaignStatsMap[msg.campaign_id].sent++;
          if (msg.status === 'delivered') campaignStatsMap[msg.campaign_id].delivered++;
          if (msg.status === 'read') {
            campaignStatsMap[msg.campaign_id].delivered++;
            campaignStatsMap[msg.campaign_id].read++;
          }
          if (msg.status === 'failed') campaignStatsMap[msg.campaign_id].failed++;
        }
      }
    });

    // Compute Rates
    const deliveryRate = sentCount > 0 ? Number(((deliveredCount / sentCount) * 100).toFixed(1)) : 0;
    const readRate = deliveredCount > 0 ? Number(((readCount / deliveredCount) * 100).toFixed(1)) : 0;
    const failureRate = sentCount > 0 ? Number(((failedCount / sentCount) * 100).toFixed(1)) : 0;
    const responseRate = sentCount > 0 ? Number(((inboundCount / sentCount) * 100).toFixed(1)) : 0;

    // Convert time series to sorted array
    const timeSeries = Object.values(timeSeriesMap).sort((a, b) => a.date.localeCompare(b.date));

    // Comparative campaign table
    const campaignComparison = (campaigns || []).map((c) => {
      const stats = campaignStatsMap[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 };
      const cDeliveryRate = stats.sent > 0 ? Number(((stats.delivered / stats.sent) * 100).toFixed(1)) : 0;
      const cReadRate = stats.delivered > 0 ? Number(((stats.read / stats.delivered) * 100).toFixed(1)) : 0;

      return {
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
        status: c.status,
        sent: stats.sent,
        delivered: stats.delivered,
        read: stats.read,
        failed: stats.failed,
        deliveryRate: cDeliveryRate,
        readRate: cReadRate,
      };
    }).sort((a, b) => b.sent - a.sent);

    // 5. Handle CSV Export
    if (isCsvExport) {
      const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const csvLines = [
        ['Date', 'Sent', 'Delivered', 'Read', 'Failed', 'Inbound Received'].map(escapeCsv).join(','),
        ...timeSeries.map((row) => [
          row.date,
          row.sent,
          row.delivered,
          row.read,
          row.failed,
          row.inbound
        ].map(escapeCsv).join(',')),
        [],
        ['Campaign Name', 'Created At', 'Status', 'Sent', 'Delivered', 'Read', 'Failed', 'Delivery Rate %', 'Read Rate %'].map(escapeCsv).join(','),
        ...campaignComparison.map((c) => [
          c.name,
          new Date(c.createdAt).toLocaleDateString(),
          c.status,
          c.sent,
          c.delivered,
          c.read,
          c.failed,
          c.deliveryRate,
          c.readRate
        ].map(escapeCsv).join(','))
      ];

      return new Response(csvLines.join('\r\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="pro_analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv"`
        }
      });
    }

    return NextResponse.json({
      range,
      days,
      totals: {
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
        inbound: inboundCount,
        deliveryRate,
        readRate,
        failureRate,
        responseRate,
      },
      timeSeries,
      hourlyDistribution,
      campaignComparison,
    });
  } catch (err: any) {
    console.error('[Advanced Analytics API Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
