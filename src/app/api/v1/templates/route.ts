import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { getTemplatesServer, invalidateTemplatesCache } from '@/lib/server/templates';

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

  try {
    const url = new URL(req.url);
    const approvedOnly = url.searchParams.get('status') === 'APPROVED';

    const templates = await getTemplatesServer(tenantId, approvedOnly);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/templates',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(templates || [], 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch templates', 500, { requestId }), origin);
  }
}
