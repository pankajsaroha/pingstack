import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const [tenantsRes, waAccountsRes, templatesRes, campaignsRes, messagesRes, usersRes] = await Promise.all([
      db.from('tenants').select('id, name, public_id, plan_type, subscription_status, created_at, last_usage_reset'),
      db.from('whatsapp_accounts').select('id, tenant_id, status, created_at'),
      db.from('templates').select('id, tenant_id, status, created_at'),
      db.from('campaigns').select('id, tenant_id, status, created_at'),
      db.from('messages').select('id, tenant_id, status, created_at'),
      db.from('users').select('id, tenant_id, email, name, created_at'),
    ]);

    const tenants = tenantsRes.data || [];
    const waAccounts = waAccountsRes.data || [];
    const templates = templatesRes.data || [];
    const campaigns = campaignsRes.data || [];
    const messages = messagesRes.data || [];
    const users = usersRes.data || [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Map sets for quick lookups
    const waByTenant = new Map<string, any>();
    const connectedWaTenants = new Set<string>();
    const startedWaTenants = new Set<string>();

    waAccounts.forEach((wa: any) => {
      if (wa.tenant_id) {
        waByTenant.set(wa.tenant_id, wa);
        startedWaTenants.add(wa.tenant_id);
        if (wa.status === 'ACTIVE' || wa.status === 'CONNECTED') {
          connectedWaTenants.add(wa.tenant_id);
        }
      }
    });

    const tenantsWithTemplates = new Set<string>();
    const tenantsWithApprovedTemplates = new Set<string>();
    let totalTemplatesCount = templates.length;
    let approvedTemplatesCount = 0;
    let rejectedTemplatesCount = 0;
    let pendingTemplatesCount = 0;

    templates.forEach((t: any) => {
      if (t.tenant_id) {
        tenantsWithTemplates.add(t.tenant_id);
        if (t.status === 'APPROVED') {
          tenantsWithApprovedTemplates.add(t.tenant_id);
          approvedTemplatesCount += 1;
        } else if (t.status === 'REJECTED') {
          rejectedTemplatesCount += 1;
        } else {
          pendingTemplatesCount += 1;
        }
      }
    });

    const tenantsWithSuccessfulMessages = new Set<string>();
    const messagesCountByTenant = new Map<string, number>();
    const successfulMessagesCountByTenant = new Map<string, number>();
    const failedMessagesCountByTenant = new Map<string, number>();
    const recentMessagesCountByTenant = new Map<string, number>();
    const firstMessageTimeByTenant = new Map<string, Date>();

    messages.forEach((m: any) => {
      if (m.tenant_id) {
        messagesCountByTenant.set(m.tenant_id, (messagesCountByTenant.get(m.tenant_id) || 0) + 1);

        const isSuccess = m.status === 'sent' || m.status === 'delivered' || m.status === 'read';
        if (isSuccess) {
          tenantsWithSuccessfulMessages.add(m.tenant_id);
          successfulMessagesCountByTenant.set(m.tenant_id, (successfulMessagesCountByTenant.get(m.tenant_id) || 0) + 1);
        } else if (m.status === 'failed') {
          failedMessagesCountByTenant.set(m.tenant_id, (failedMessagesCountByTenant.get(m.tenant_id) || 0) + 1);
        }

        const mDate = new Date(m.created_at);
        if (mDate >= fourteenDaysAgo && isSuccess) {
          recentMessagesCountByTenant.set(m.tenant_id, (recentMessagesCountByTenant.get(m.tenant_id) || 0) + 1);
        }

        if (isSuccess && (!firstMessageTimeByTenant.has(m.tenant_id) || mDate < firstMessageTimeByTenant.get(m.tenant_id)!)) {
          firstMessageTimeByTenant.set(m.tenant_id, mDate);
        }
      }
    });

    const tenantsWithCompletedCampaign = new Set<string>();
    campaigns.forEach((c: any) => {
      if (c.tenant_id && c.status === 'completed') {
        tenantsWithCompletedCampaign.add(c.tenant_id);
      }
    });

    // 1. ONBOARDING FUNNEL
    const totalSignups = tenants.length;
    const countStartedWa = startedWaTenants.size;
    const countConnectedWa = connectedWaTenants.size;
    const countTemplates = tenantsWithTemplates.size;
    const countApprovedTemplates = tenantsWithApprovedTemplates.size;
    const countFirstMessage = tenantsWithSuccessfulMessages.size;
    const countFirstCampaign = tenantsWithCompletedCampaign.size;

    const calcPct = (count: number, base: number) => (base > 0 ? Number(((count / base) * 100).toFixed(1)) : 0);

    const funnel = [
      {
        step: 1,
        name: 'Signed Up',
        count: totalSignups,
        percentageOfTotal: 100,
        dropoff: 0,
        description: 'Businesses that registered on Pingstack',
      },
      {
        step: 2,
        name: 'WhatsApp Setup Started',
        count: countStartedWa,
        percentageOfTotal: calcPct(countStartedWa, totalSignups),
        dropoff: totalSignups > 0 ? Number((100 - calcPct(countStartedWa, totalSignups)).toFixed(1)) : 0,
        description: 'Initiated Meta Cloud API onboarding',
      },
      {
        step: 3,
        name: 'WhatsApp Connected',
        count: countConnectedWa,
        percentageOfTotal: calcPct(countConnectedWa, totalSignups),
        dropoff: countStartedWa > 0 ? Number((100 - calcPct(countConnectedWa, countStartedWa)).toFixed(1)) : 0,
        description: 'Phone number registered & ACTIVE with Meta',
      },
      {
        step: 4,
        name: 'Template Created',
        count: countTemplates,
        percentageOfTotal: calcPct(countTemplates, totalSignups),
        dropoff: countConnectedWa > 0 ? Number((100 - calcPct(countTemplates, countConnectedWa)).toFixed(1)) : 0,
        description: 'Saved at least one WhatsApp template',
      },
      {
        step: 5,
        name: 'Template Approved',
        count: countApprovedTemplates,
        percentageOfTotal: calcPct(countApprovedTemplates, totalSignups),
        dropoff: countTemplates > 0 ? Number((100 - calcPct(countApprovedTemplates, countTemplates)).toFixed(1)) : 0,
        description: 'Meta reviewed & approved message template',
      },
      {
        step: 6,
        name: 'First Message Sent',
        count: countFirstMessage,
        percentageOfTotal: calcPct(countFirstMessage, totalSignups),
        dropoff: countApprovedTemplates > 0 ? Number((100 - calcPct(countFirstMessage, countApprovedTemplates)).toFixed(1)) : 0,
        description: 'Dispatched and successfully delivered first message',
      },
      {
        step: 7,
        name: 'First Campaign Completed',
        count: countFirstCampaign,
        percentageOfTotal: calcPct(countFirstCampaign, totalSignups),
        dropoff: countFirstMessage > 0 ? Number((100 - calcPct(countFirstCampaign, countFirstMessage)).toFixed(1)) : 0,
        description: 'Completed broadcast campaign to audience',
      },
    ];

    // 2. ACTIVATION COHORTS / SEGMENTS
    const segments = {
      new: [] as any[],
      activated: [] as any[],
      atRisk: [] as any[],
      inactive: [] as any[],
    };

    tenants.forEach((t: any) => {
      const createdAt = new Date(t.created_at);
      const isWAConnected = connectedWaTenants.has(t.id);
      const totalSent = messagesCountByTenant.get(t.id) || 0;
      const successfulSent = successfulMessagesCountByTenant.get(t.id) || 0;
      const failedSent = failedMessagesCountByTenant.get(t.id) || 0;
      const recentSent = recentMessagesCountByTenant.get(t.id) || 0;
      const isNew = createdAt >= sevenDaysAgo;

      const item = {
        id: t.id,
        name: t.name,
        publicId: t.public_id,
        planType: t.plan_type || 'starter',
        createdAt: t.created_at,
        whatsappStatus: isWAConnected ? 'Connected' : 'Disconnected',
        totalMessages: totalSent,
        successfulMessages: successfulSent,
        recentMessages: recentSent,
      };

      if (isNew) {
        segments.new.push(item);
      } else if (isWAConnected && successfulSent > 0 && recentSent > 0) {
        segments.activated.push(item);
      } else if (isWAConnected) {
        let riskReason = 'Connected WhatsApp but zero messages sent';
        if (failedSent > 0 && successfulSent === 0) {
          riskReason = 'Messages failing due to Meta payment/account error';
        } else if (successfulSent > 0 && recentSent === 0) {
          riskReason = 'No messages sent in last 14 days';
        }
        segments.atRisk.push({
          ...item,
          riskReason,
        });
      } else {
        segments.inactive.push({
          ...item,
          inactiveReason: !isWAConnected ? 'Never completed WhatsApp connection' : 'Zero activity recorded',
        });
      }
    });

    // 3. PRODUCT INSIGHTS
    // Top businesses by volume
    const topBusinesses = tenants
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        planType: t.plan_type || 'starter',
        messagesSent: messagesCountByTenant.get(t.id) || 0,
        whatsappStatus: connectedWaTenants.has(t.id) ? 'Connected' : 'Disconnected',
      }))
      .sort((a, b) => b.messagesSent - a.messagesSent)
      .slice(0, 5);

    // Average time from signup to WhatsApp connection (hours)
    let totalConnHours = 0;
    let connCount = 0;
    tenants.forEach((t: any) => {
      const wa = waByTenant.get(t.id);
      if (wa && (wa.status === 'ACTIVE' || wa.status === 'CONNECTED') && wa.created_at && t.created_at) {
        const diffMs = new Date(wa.created_at).getTime() - new Date(t.created_at).getTime();
        if (diffMs > 0) {
          totalConnHours += diffMs / (1000 * 60 * 60);
          connCount += 1;
        }
      }
    });
    const avgSignupToWaHours = connCount > 0 ? Number((totalConnHours / connCount).toFixed(1)) : 0;

    // Average time from WA connection to first message (hours)
    let totalFirstMsgHours = 0;
    let firstMsgCount = 0;
    tenants.forEach((t: any) => {
      const wa = waByTenant.get(t.id);
      const firstMsg = firstMessageTimeByTenant.get(t.id);
      if (wa?.created_at && firstMsg) {
        const diffMs = firstMsg.getTime() - new Date(wa.created_at).getTime();
        if (diffMs > 0) {
          totalFirstMsgHours += diffMs / (1000 * 60 * 60);
          firstMsgCount += 1;
        }
      }
    });
    const avgWaToFirstMsgHours = firstMsgCount > 0 ? Number((totalFirstMsgHours / firstMsgCount).toFixed(1)) : 0;

    const activeBizCount = segments.activated.length;
    const totalMsgCount = messages.length;
    const avgMessagesPerActiveBusiness = activeBizCount > 0 ? Math.round(totalMsgCount / activeBizCount) : 0;

    return NextResponse.json({
      funnel,
      segments: {
        new: { count: segments.new.length, items: segments.new.slice(0, 10) },
        activated: { count: segments.activated.length, items: segments.activated.slice(0, 10) },
        atRisk: { count: segments.atRisk.length, items: segments.atRisk.slice(0, 10) },
        inactive: { count: segments.inactive.length, items: segments.inactive.slice(0, 10) },
      },
      insights: {
        topBusinesses,
        avgSignupToWaHours,
        avgWaToFirstMsgHours,
        avgMessagesPerActiveBusiness,
        templateDistribution: {
          total: totalTemplatesCount,
          approved: approvedTemplatesCount,
          pending: pendingTemplatesCount,
          rejected: rejectedTemplatesCount,
          approvalRate: totalTemplatesCount > 0 ? Number(((approvedTemplatesCount / totalTemplatesCount) * 100).toFixed(1)) : 0,
        },
      },
    });
  } catch (err: any) {
    console.error('[Admin Analytics API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
