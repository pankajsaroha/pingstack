import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { deliverDeveloperWebhookJob } from '@/lib/server/developer-webhooks';
import { randomBytes } from 'crypto';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
}

export async function POST(
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
    const { data: endpoint, error } = await db
      .from('developer_webhook_endpoints')
      .select('id, url, signing_secret')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !endpoint) {
      return withCors(apiError('NOT_FOUND', `Webhook endpoint with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    const testEventId = `evt_test_${randomBytes(8).toString('hex')}`;
    const testPayload = {
      id: testEventId,
      type: 'pingstack.test',
      api_version: 'v1' as const,
      created_at: new Date().toISOString(),
      data: {
        message: 'This is a test webhook event from Pingstack Developer Platform.',
        endpoint_id: id,
        timestamp: Date.now(),
      }
    };

    const deliveryResult = await deliverDeveloperWebhookJob({
      tenantId,
      endpointId: id,
      url: endpoint.url,
      signingSecret: endpoint.signing_secret,
      eventType: 'pingstack.test',
      eventId: testEventId,
      payload: testPayload,
    });

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: `/api/v1/webhooks/${id}/test`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'webhook_endpoint',
      resourceId: id,
    });

    return withCors(apiSuccess({
      success: true,
      event_id: testEventId,
      response_status: deliveryResult.statusCode,
      message: 'Test ping delivered to your webhook endpoint.'
    }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('BAD_GATEWAY', `Webhook test delivery failed: ${err?.message}`, 502, { requestId }), origin);
  }
}
