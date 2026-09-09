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
    const { data: template, error } = await db
      .from('templates')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!template) {
      return withCors(apiError('NOT_FOUND', `Template "${id}" was not found in your workspace.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/templates/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'template',
      resourceId: template.id,
    });

    return withCors(apiSuccess(template, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch template', 500, { requestId }), origin);
  }
}
