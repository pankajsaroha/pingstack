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
    const { data: webhook, error } = await db
      .from('developer_webhook_endpoints')
      .select('id, url, subscribed_events, is_active, created_at, updated_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!webhook) {
      return withCors(apiError('NOT_FOUND', `Webhook endpoint with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    // Fetch recent delivery logs
    const { data: deliveries } = await db
      .from('developer_webhook_deliveries')
      .select('id, event_type, event_id, response_status, error, created_at')
      .eq('endpoint_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/webhooks/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'webhook_endpoint',
      resourceId: id,
    });

    return withCors(apiSuccess({
      ...webhook,
      recent_deliveries: deliveries || [],
    }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch webhook', 500, { requestId }), origin);
  }
}

export async function DELETE(
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
    const { data: deleted, error } = await db
      .from('developer_webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, url')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) {
      return withCors(apiError('NOT_FOUND', `Webhook endpoint with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: `/api/v1/webhooks/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'webhook_endpoint',
      resourceId: id,
    });

    return withCors(apiSuccess({ deleted: true, id }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to delete webhook endpoint', 500, { requestId }), origin);
  }
}
