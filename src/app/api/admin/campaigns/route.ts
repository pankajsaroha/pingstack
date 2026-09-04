import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    const [campaignsRes, tenantsRes, templatesRes, messagesRes] = await Promise.all([
      db.from('campaigns').select('*').order('created_at', { ascending: false }),
      db.from('tenants').select('id, name, public_id'),
      db.from('templates').select('id, name'),
      db.from('messages').select('campaign_id, status'),
    ]);

    const campaigns = campaignsRes.data || [];
    const tenants = tenantsRes.data || [];
    const templates = templatesRes.data || [];
    const messages = messagesRes.data || [];

    const tenantMap = new Map<string, any>();
    tenants.forEach((t: any) => tenantMap.set(t.id, t));

    const templateMap = new Map<string, any>();
    templates.forEach((t: any) => templateMap.set(t.id, t));

    // Message stats per campaign
    const campaignStatsMap = new Map<string, { total: number; sent: number; delivered: number; failed: number }>();
    messages.forEach((m: any) => {
      if (m.campaign_id) {
        if (!campaignStatsMap.has(m.campaign_id)) {
          campaignStatsMap.set(m.campaign_id, { total: 0, sent: 0, delivered: 0, failed: 0 });
        }
        const s = campaignStatsMap.get(m.campaign_id)!;
        s.total += 1;
        if (m.status === 'sent' || m.status === 'delivered' || m.status === 'read') s.sent += 1;
        if (m.status === 'delivered' || m.status === 'read') s.delivered += 1;
        if (m.status === 'failed') s.failed += 1;
      }
    });

    let totalRecipients = 0;
    let totalSuccessfulSends = 0;
    let totalFailedSends = 0;

    let campaignsCreated = campaigns.length;
    let campaignsRunning = 0;
    let campaignsCompleted = 0;
    let campaignsFailed = 0;

    const formattedCampaigns = campaigns.map((c: any) => {
      const tenant = tenantMap.get(c.tenant_id);
      const template = templateMap.get(c.template_id);
      const stats = campaignStatsMap.get(c.id) || { total: 0, sent: 0, delivered: 0, failed: 0 };

      totalRecipients += stats.total;
      totalSuccessfulSends += stats.delivered;
      totalFailedSends += stats.failed;

      if (c.status === 'running' || c.status === 'scheduled') campaignsRunning += 1;
      else if (c.status === 'completed') campaignsCompleted += 1;
      else if (c.status === 'failed') campaignsFailed += 1;

      const completionRate = stats.total > 0 ? Number(((stats.delivered / stats.total) * 100).toFixed(1)) : 100;
      const failRate = stats.total > 0 ? Number(((stats.failed / stats.total) * 100).toFixed(1)) : 0;

      return {
        id: c.id,
        publicId: c.public_id,
        name: c.name,
        status: c.status,
        businessId: c.tenant_id,
        businessName: tenant?.name || 'Unknown Business',
        templateName: template?.name || 'Standard Template',
        scheduledAt: c.scheduled_at,
        createdAt: c.created_at,
        recipients: stats.total,
        delivered: stats.delivered,
        failed: stats.failed,
        completionRate,
        failRate,
      };
    });

    const filtered = statusFilter === 'all'
      ? formattedCampaigns
      : formattedCampaigns.filter((c: any) => c.status.toLowerCase() === statusFilter.toLowerCase());

    const overallCompletionRate = totalRecipients > 0 ? Number(((totalSuccessfulSends / totalRecipients) * 100).toFixed(1)) : 100;
    const overallFailureRate = totalRecipients > 0 ? Number(((totalFailedSends / totalRecipients) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      metrics: {
        campaignsCreated,
        campaignsRunning,
        campaignsCompleted,
        campaignsFailed,
        totalRecipients,
        successfulSends: totalSuccessfulSends,
        failedSends: totalFailedSends,
        completionRate: overallCompletionRate,
        failureRate: overallFailureRate,
      },
      campaigns: filtered,
    });
  } catch (err: any) {
    console.error('[Admin Campaigns API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
}
