import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { connection, messageQueue } from '@/lib/queue';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const startTime = performance.now();

    // 1. Benchmark DB response time and fetch operational data
    const [dbTestRes, waAccountsRes, failedMessagesRes, tenantsRes] = await Promise.all([
      db.from('tenants').select('id').limit(1),
      db.from('whatsapp_accounts').select('id, tenant_id, status, phone_number_id, business_id, updated_at'),
      db.from('messages').select('id, tenant_id, phone_number, error, created_at').eq('status', 'failed').order('created_at', { ascending: false }).limit(200),
      db.from('tenants').select('id, name, public_id'),
    ]);

    const dbLatencyMs = Math.round(performance.now() - startTime);

    const waAccounts = waAccountsRes.data || [];
    const failedMessages = failedMessagesRes.data || [];
    const tenants = tenantsRes.data || [];

    const tenantMap = new Map<string, string>();
    tenants.forEach((t: any) => tenantMap.set(t.id, t.name));

    // WhatsApp Account Health Aggregations
    let connectedAccounts = 0;
    let disconnectedAccounts = 0;
    let pendingAccounts = 0;

    waAccounts.forEach((wa: any) => {
      if (wa.status === 'ACTIVE' || wa.status === 'CONNECTED') connectedAccounts += 1;
      else if (wa.status === 'PENDING' || wa.status === 'UNVERIFIED') pendingAccounts += 1;
      else disconnectedAccounts += 1;
    });

    // WhatsApp Error Code Grouping
    // Meta Error Codes:
    // 133010: Account not registered
    // 131049: Ecosystem engagement protection
    // 132001: Template not found
    // 131026: Undeliverable message
    // 130429: Rate limit hit
    // 100: Invalid parameter
    const errorGroupsMap = new Map<string, {
      code: string;
      title: string;
      description: string;
      count: number;
      affectedTenants: Set<string>;
      recentSample: string | null;
      lastOccurred: string;
    }>();

    const getErrorCodeDetails = (rawError: string | null) => {
      if (!rawError) return { code: 'UNKNOWN', title: 'Generic Undelivered', description: 'Message delivery failed' };
      const str = rawError.toString();
      
      if (str.includes('133010') || str.includes('not registered')) {
        return { code: '133010', title: 'Account Not Registered', description: 'WhatsApp business phone number is not registered on Meta Cloud API.' };
      }
      if (str.includes('131049') || str.includes('engagement')) {
        return { code: '131049', title: 'Engagement Protection', description: 'Message not delivered due to Meta ecosystem recipient protection.' };
      }
      if (str.includes('132001') || str.includes('template')) {
        return { code: '132001', title: 'Template Not Found / Unapproved', description: 'Template does not exist or has not been approved in target language.' };
      }
      if (str.includes('131026') || str.includes('undeliverable')) {
        return { code: '131026', title: 'Message Undeliverable', description: 'Recipient phone number is invalid or not on WhatsApp.' };
      }
      if (str.includes('130429') || str.includes('rate limit')) {
        return { code: '130429', title: 'Rate Limit Reached', description: 'Exceeded WhatsApp Cloud API messaging throughput.' };
      }
      
      return { code: 'META_ERROR', title: 'Meta Cloud API Error', description: str.slice(0, 100) };
    };

    failedMessages.forEach((m: any) => {
      const details = getErrorCodeDetails(m.error);
      if (!errorGroupsMap.has(details.code)) {
        errorGroupsMap.set(details.code, {
          code: details.code,
          title: details.title,
          description: details.description,
          count: 0,
          affectedTenants: new Set<string>(),
          recentSample: m.error,
          lastOccurred: m.created_at,
        });
      }
      const g = errorGroupsMap.get(details.code)!;
      g.count += 1;
      if (m.tenant_id) g.affectedTenants.add(m.tenant_id);
    });

    const errorBreakdown = Array.from(errorGroupsMap.values()).map((g) => ({
      code: g.code,
      title: g.title,
      description: g.description,
      count: g.count,
      affectedBusinessesCount: g.affectedTenants.size,
      affectedBusinesses: Array.from(g.affectedTenants).map((tid) => ({
        id: tid,
        name: tenantMap.get(tid) || 'Business',
      })),
      recentSample: g.recentSample,
      lastOccurred: g.lastOccurred,
    }));

    // 2. Redis & Queue Health Check
    let redisStatus = 'DISCONNECTED';
    let queueDepth = 0;
    let activeJobs = 0;

    if (connection && connection.status === 'ready') {
      redisStatus = 'HEALTHY';
      try {
        if (messageQueue) {
          const waiting = await messageQueue.getWaitingCount();
          const active = await messageQueue.getActiveCount();
          queueDepth = waiting;
          activeJobs = active;
        }
      } catch (qErr) {
        console.warn('[System Health] Queue inspect warning:', qErr);
      }
    }

    // 3. Process & Memory metrics
    const memoryUsage = process.memoryUsage();
    const memoryMb = Math.round(memoryUsage.rss / (1024 * 1024));
    const uptimeSec = Math.round(process.uptime());

    return NextResponse.json({
      database: {
        status: dbTestRes.error ? 'DEGRADED' : 'HEALTHY',
        latencyMs: dbLatencyMs,
        provider: 'Supabase PostgreSQL',
      },
      redis: {
        status: redisStatus,
        queueDepth,
        activeJobs,
      },
      worker: {
        status: redisStatus === 'HEALTHY' ? 'RUNNING' : 'STANDBY',
        type: 'BullMQ Message Dispatcher',
      },
      runtime: {
        uptimeSeconds: uptimeSec,
        memoryRssMb: memoryMb,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      whatsappHealth: {
        connectedAccounts,
        disconnectedAccounts,
        pendingAccounts,
        totalAccounts: waAccounts.length,
        errorBreakdown,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Admin System Health API] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch system health' }, { status: 500 });
  }
}
