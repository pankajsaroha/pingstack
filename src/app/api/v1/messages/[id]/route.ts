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
    const { data: message, error } = await db
      .from('messages')
      .select('id, contact_id, phone_number, direction, message_type, status, content, variables, provider_message_id, campaign_id, error, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!message) {
      return withCors(apiError('NOT_FOUND', `Message with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/messages/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'message',
      resourceId: id,
    });

    return withCors(apiSuccess(message, 200, { requestId }), origin);
  } catch (err: any) {
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/messages/${id}`,
      statusCode: 500,
      latencyMs: Date.now() - startTime,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch message', 500, { requestId }), origin);
  }
}
