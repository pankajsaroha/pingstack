import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { generatePerformanceReport, recordLatency } from '@/lib/server/latency-telemetry';
import { getOnboardingMetrics } from '@/lib/server/onboarding-telemetry';
import { dbAdmin as db } from '@/lib/db';
import { connection } from '@/lib/queue';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;

  try {
    // 1. Live infrastructure timing check
    const dbStart = performance.now();
    let dbStatus = 'HEALTHY';
    let dbLatencyMs = 0;
    try {
      if (db) {
        await db.from('whatsapp_accounts').select('id').limit(1);
        dbLatencyMs = Math.round(performance.now() - dbStart);
      }
    } catch {
      dbStatus = 'DEGRADED';
    }

    const redisStart = performance.now();
    let redisStatus = 'CONNECTED';
    let redisLatencyMs = 0;
    try {
      if (connection && connection.status === 'ready') {
        await connection.ping();
        redisLatencyMs = Math.round(performance.now() - redisStart);
      }
    } catch {
      redisStatus = 'DISCONNECTED';
    }

    // 2. Fetch historical api_request_logs to enrich developer API & endpoint stats
    if (db) {
      try {
        const { data: logs } = await db
          .from('api_request_logs')
          .select('endpoint, latency_ms, status_code, created_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (logs && logs.length > 0) {
          for (const l of logs) {
            recordLatency(
              'DEVELOPER_API',
              l.endpoint || 'api_v1',
              'request_latency',
              l.latency_ms || 50,
              (l.status_code || 200) >= 400
            );
          }
        }
      } catch {
        // Fail-open
      }
    }

    // 3. Generate aggregated report with P50/P95/P99
    const report = generatePerformanceReport();
    const onboardingMetrics = await getOnboardingMetrics();

    return NextResponse.json({
      success: true,
      report,
      onboardingMetrics,
      liveInfrastructure: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        redis: { status: redisStatus, latencyMs: redisLatencyMs }
      }
    });
  } catch (err: any) {
    console.error('[Admin Performance API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate performance report' }, { status: 500 });
  }
}
