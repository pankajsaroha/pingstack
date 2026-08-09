import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { connection as redis } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, 'ok' | 'error'> = {
    database: 'error',
    redis: 'error',
  };

  // 1. Check Database connectivity
  if (db) {
    try {
      const { error } = await db.from('tenants').select('id', { count: 'exact', head: true });
      if (!error) {
        checks.database = 'ok';
      }
    } catch (dbErr) {
      console.error('[Health Check] Database query failed:', dbErr);
    }
  }

  // 2. Check Redis connectivity
  if (redis && redis.status === 'ready') {
    try {
      const pong = await redis.ping();
      if (pong === 'PONG') {
        checks.redis = 'ok';
      }
    } catch (redisErr) {
      console.error('[Health Check] Redis ping failed:', redisErr);
    }
  }

  const isHealthy = checks.database === 'ok' && checks.redis === 'ok';
  const responseTimeMs = Date.now() - startTime;

  const body = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs,
    checks,
  };

  return NextResponse.json(body, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
