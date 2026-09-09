import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');
  const { id } = await params;

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const { data: campaign, error: cErr } = await db
      .from('campaigns')
      .select('id, name, status, error, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (cErr || !campaign) {
      return withCors(apiError('NOT_FOUND', `Campaign with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    const { data: messages } = await db
      .from('messages')
      .select('status')
      .eq('campaign_id', id)
      .eq('tenant_id', tenantId);

    const counts = {
      pending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      total: 0
    };

    (messages || []).forEach((m: any) => {
      counts.total++;
      const s = m.status || 'unknown';
      if (counts[s as keyof typeof counts] !== undefined) {
        (counts as any)[s]++;
      }
    });

    const deliveredRate = counts.total > 0 ? Math.round(((counts.delivered + counts.read) / counts.total) * 100) : 0;
    const readRate = counts.total > 0 ? Math.round((counts.read / counts.total) * 100) : 0;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/campaigns/${id}/results`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'campaign',
      resourceId: id,
    });

    return withCors(apiSuccess({
      campaign_id: id,
      name: campaign.name,
      status: campaign.status,
      metrics: {
        total_messages: counts.total,
        pending: counts.pending,
        sent: counts.sent,
        delivered: counts.delivered,
        read: counts.read,
        failed: counts.failed,
        delivered_rate_pct: deliveredRate,
        read_rate_pct: readRate,
      }
    }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch campaign results', 500, { requestId }), origin);
  }
}
