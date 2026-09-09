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
    const { data: campaign, error } = await db
      .from('campaigns')
      .select('*, templates(name, language, content)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!campaign) {
      return withCors(apiError('NOT_FOUND', `Campaign with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    // Fetch stats for this campaign
    const { data: messages } = await db
      .from('messages')
      .select('status')
      .eq('campaign_id', id)
      .eq('tenant_id', tenantId);

    const stats = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    (messages || []).forEach((m: any) => {
      const s = m.status || 'unknown';
      if (stats[s as keyof typeof stats] !== undefined) {
        (stats as any)[s]++;
      }
    });

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/campaigns/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'campaign',
      resourceId: id,
    });

    return withCors(apiSuccess({ ...campaign, stats }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch campaign', 500, { requestId }), origin);
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
    // Unlink messages rather than destructive deletion
    await db.from('messages').update({ campaign_id: null }).eq('campaign_id', id).eq('tenant_id', tenantId);

    const { data: deleted, error } = await db
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) {
      return withCors(apiError('NOT_FOUND', `Campaign with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: `/api/v1/campaigns/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'campaign',
      resourceId: id,
    });

    return withCors(apiSuccess({ deleted: true, id }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to delete campaign', 500, { requestId }), origin);
  }
}
