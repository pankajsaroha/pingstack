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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
    const offset = (page - 1) * pageSize;
    const endpoint = url.searchParams.get('endpoint');
    const statusCode = url.searchParams.get('status_code');
    const reqId = url.searchParams.get('request_id');

    let query = db
      .from('api_request_logs')
      .select('id, request_id, method, endpoint, status_code, latency_ms, resource_type, resource_id, error_code, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (endpoint) query = query.ilike('endpoint', `%${endpoint}%`);
    if (statusCode) query = query.eq('status_code', parseInt(statusCode, 10));
    if (reqId) query = query.eq('request_id', reqId);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    return withCors(apiSuccess(logs || [], 200, {
      requestId,
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        hasMore: (offset + (logs?.length || 0)) < (count || 0),
      }
    }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch API logs', 500, { requestId }), origin);
  }
}
