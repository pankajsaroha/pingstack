import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
}

export async function GET(req: Request) {
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
    const cutoffIso = new Date(Date.now() - days * 86400 * 1000).toISOString();

    const [logsRes, webhookDeliveriesRes, messageCountRes] = await Promise.all([
      db.from('api_request_logs')
        .select('method, endpoint, status_code, latency_ms, error_code, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', cutoffIso),
      db.from('developer_webhook_deliveries')
        .select('event_type, response_status, error, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', cutoffIso),
      db.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', cutoffIso)
    ]);

    const logs = logsRes.data || [];
    const webhooks = webhookDeliveriesRes.data || [];

    let totalRequests = logs.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalLatency = 0;

    const endpointBreakdown: Record<string, { count: number; errors: number; total_latency: number }> = {};
    const errorBreakdown: Record<string, number> = {};

    logs.forEach((log: any) => {
      totalLatency += log.latency_ms || 0;
      const isSuccess = log.status_code >= 200 && log.status_code < 400;
      if (isSuccess) successfulRequests++;
      else {
        failedRequests++;
        const errKey = log.error_code || `HTTP_${log.status_code}`;
        errorBreakdown[errKey] = (errorBreakdown[errKey] || 0) + 1;
      }

      const ep = `${log.method} ${log.endpoint}`;
      if (!endpointBreakdown[ep]) {
        endpointBreakdown[ep] = { count: 0, errors: 0, total_latency: 0 };
      }
      endpointBreakdown[ep].count++;
      endpointBreakdown[ep].total_latency += log.latency_ms || 0;
      if (!isSuccess) endpointBreakdown[ep].errors++;
    });

    const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
    const successRatePct = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;

    // Webhook metrics
    const totalWebhooks = webhooks.length;
    const successfulWebhooks = webhooks.filter((w: any) => !w.error && w.response_status && w.response_status < 400).length;
    const failedWebhooks = totalWebhooks - successfulWebhooks;

    return withCors(apiSuccess({
      period_days: days,
      overview: {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        success_rate_pct: successRatePct,
        avg_latency_ms: avgLatencyMs,
        messages_recorded: messageCountRes.count || 0,
        webhook_deliveries_total: totalWebhooks,
        webhook_deliveries_success: successfulWebhooks,
        webhook_deliveries_failed: failedWebhooks,
      },
      error_breakdown: errorBreakdown,
      endpoints: Object.entries(endpointBreakdown).map(([endpoint, data]) => ({
        endpoint,
        total_requests: data.count,
        error_count: data.errors,
        avg_latency_ms: data.count > 0 ? Math.round(data.total_latency / data.count) : 0,
      })),
    }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch usage metrics', 500, { requestId }), origin);
  }
}
