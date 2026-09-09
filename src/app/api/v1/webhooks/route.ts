import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { isSafeWebhookUrl } from '@/lib/server/ssrf';
import { generateWebhookSecret } from '@/lib/server/developer-webhooks';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const { data: webhooks, error } = await db
      .from('developer_webhook_endpoints')
      .select('id, url, subscribed_events, is_active, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/webhooks',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(webhooks || [], 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch webhooks', 500, { requestId }), origin);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = req.headers.get('origin');

  const auth = await authenticateDeveloperRequest(req, requestId);
  if (!auth.authenticated || !auth.context) {
    return withCors(auth.errorResponse!, origin);
  }
  const { tenantId, apiKeyId } = auth.context;

  if (!db) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', 'Database unavailable', 500, { requestId }), origin);
  }

  try {
    const body = await req.json();
    const { url, events = ['*'] } = body;

    // 1. SSRF Safety check
    const ssrfCheck = isSafeWebhookUrl(url);
    if (!ssrfCheck.safe) {
      return withCors(apiError('VALIDATION_ERROR', ssrfCheck.reason || 'Invalid or prohibited webhook target URL.', 400, {
        details: [{ field: 'url', message: ssrfCheck.reason || 'Prohibited URL' }],
        requestId
      }), origin);
    }

    const signingSecret = generateWebhookSecret();
    const subscribedEvents = Array.isArray(events) && events.length > 0 ? events : ['*'];

    const { data: endpoint, error } = await db
      .from('developer_webhook_endpoints')
      .insert({
        tenant_id: tenantId,
        url: url.trim(),
        signing_secret: signingSecret,
        subscribed_events: subscribedEvents,
        is_active: true,
      })
      .select('id, url, subscribed_events, is_active, created_at')
      .single();

    if (error) throw error;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/webhooks',
      statusCode: 201,
      latencyMs: Date.now() - startTime,
      resourceType: 'webhook_endpoint',
      resourceId: endpoint.id,
    });

    // Return the signing secret ONCE upon creation
    return withCors(apiSuccess({
      ...endpoint,
      signing_secret: signingSecret,
      note: 'Save this signing_secret now. It will not be shown in full again for security.'
    }, 201, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to register webhook endpoint', 500, { requestId }), origin);
  }
}
