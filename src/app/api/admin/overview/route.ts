import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    
    const startOfYesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)).toISOString();
    const endOfYesterday = startOfToday;

    const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)).toISOString();

    // 1. Parallel counts and data fetches
    const [
      tenantsCountRes,
      activeTenantsRes,
      waConnectedRes,
      runningCampaignsRes,
      messagesTodayRes,
      messagesDeliveredTodayRes,
      messagesFailedTodayRes,
      messagesYesterdayRes,
      messagesDeliveredYesterdayRes,
      messagesFailedYesterdayRes,
      recentTenantsRes,
      recentFeedbackRes,
      recentMessages7dRes,
      allTenantsWithWA,
      allUsersRes,
    ] = await Promise.all([
      // Total businesses
      db.from('tenants').select('*', { count: 'exact', head: true }),
      // Active businesses (subscription_status != 'suspended')
      db.from('tenants').select('*', { count: 'exact', head: true }).neq('subscription_status', 'suspended'),
      // WhatsApp Connected accounts
      db.from('whatsapp_accounts').select('*', { count: 'exact', head: true }).in('status', ['ACTIVE', 'CONNECTED']),
      // Running or scheduled campaigns
      db.from('campaigns').select('*', { count: 'exact', head: true }).in('status', ['running', 'scheduled']),
      // Messages today
      db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday),
      // Delivered today
      db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday).in('status', ['delivered', 'read']),
      // Failed today
      db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday).eq('status', 'failed'),
      // Messages yesterday (for period comparison)
      db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startOfYesterday).lt('created_at', endOfYesterday),
      // Delivered yesterday
      db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startOfYesterday).lt('created_at', endOfYesterday).in('status', ['delivered', 'read']),
      // Failed yesterday
      db.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startOfYesterday).lt('created_at', endOfYesterday).eq('status', 'failed'),
      // Recent 5 businesses
      db.from('tenants').select('id, public_id, name, plan_type, subscription_status, created_at').order('created_at', { ascending: false }).limit(5),
      // Recent feedback
      db.from('feedback').select('id, type, message, priority, status, email, created_at').order('created_at', { ascending: false }).limit(4),
      // 7-day messages for trend chart
      db.from('messages').select('created_at, status').gte('created_at', sevenDaysAgo).order('created_at', { ascending: true }),
      // Tenants with WA for onboarding calculation
      db.from('whatsapp_accounts').select('tenant_id, status'),
      // Users for mapping owners
      db.from('users').select('id, tenant_id, email, name'),
    ]);

    const totalBusinesses = tenantsCountRes.count || 0;
    const activeBusinesses = activeTenantsRes.count || 0;
    const whatsappConnected = waConnectedRes.count || 0;
    const activeCampaigns = runningCampaignsRes.count || 0;

    const messagesToday = messagesTodayRes.count || 0;
    const deliveredToday = messagesDeliveredTodayRes.count || 0;
    const failedToday = messagesFailedTodayRes.count || 0;

    const messagesYesterday = messagesYesterdayRes.count || 0;
    const deliveredYesterday = messagesDeliveredYesterdayRes.count || 0;
    const failedYesterday = messagesFailedYesterdayRes.count || 0;

    // Calculate onboarding incomplete (tenants without active WhatsApp connection)
    const connectedTenantIds = new Set(
      (allTenantsWithWA.data || [])
        .filter((wa: any) => wa.status === 'ACTIVE' || wa.status === 'CONNECTED')
        .map((wa: any) => wa.tenant_id)
    );
    const onboardingIncomplete = Math.max(0, totalBusinesses - connectedTenantIds.size);

    // Percentage comparisons
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const messagesChange = calcChange(messagesToday, messagesYesterday);
    const deliveredChange = calcChange(deliveredToday, deliveredYesterday);
    const failedChange = calcChange(failedToday, failedYesterday);

    // 7-day aggregation
    const daysMap: Record<string, { date: string; sent: number; delivered: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap[key] = { date: label, sent: 0, delivered: 0, failed: 0 };
    }

    (recentMessages7dRes.data || []).forEach((m: any) => {
      const key = m.created_at ? m.created_at.split('T')[0] : null;
      if (key && daysMap[key]) {
        daysMap[key].sent += 1;
        if (m.status === 'delivered' || m.status === 'read') {
          daysMap[key].delivered += 1;
        } else if (m.status === 'failed') {
          daysMap[key].failed += 1;
        }
      }
    });

    const throughput7d = Object.values(daysMap);

    // Map owner emails for recent businesses
    const usersByTenant = new Map<string, { name: string; email: string }>();
    (allUsersRes.data || []).forEach((u: any) => {
      if (u.tenant_id && !usersByTenant.has(u.tenant_id)) {
        usersByTenant.set(u.tenant_id, { name: u.name, email: u.email });
      }
    });

    const recentBusinessesWithOwners = (recentTenantsRes.data || []).map((t: any) => {
      const owner = usersByTenant.get(t.id);
      const isWAConnected = connectedTenantIds.has(t.id);
      return {
        ...t,
        ownerEmail: owner?.email || '—',
        ownerName: owner?.name || 'User',
        whatsappStatus: isWAConnected ? 'Connected' : 'Disconnected',
      };
    });

    return NextResponse.json({
      metrics: {
        totalBusinesses,
        activeBusinesses,
        whatsappConnected,
        onboardingIncomplete,
        messagesToday,
        messagesTodayChange: messagesChange,
        messagesDeliveredToday: deliveredToday,
        messagesDeliveredTodayChange: deliveredChange,
        messagesFailedToday: failedToday,
        messagesFailedTodayChange: failedChange,
        activeCampaigns,
        deliveryRateToday: messagesToday > 0 ? Number(((deliveredToday / messagesToday) * 100).toFixed(1)) : 100,
      },
      throughput7d,
      recentBusinesses: recentBusinessesWithOwners,
      recentFeedback: recentFeedbackRes.data || [],
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Admin Overview API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch admin overview' }, { status: 500 });
  }
}
