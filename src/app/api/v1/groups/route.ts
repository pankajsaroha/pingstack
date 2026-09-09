import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { invalidateGroupsCache } from '@/lib/server/groups';
import { generatePublicId } from '@/lib/utils';

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
    const url = new URL(req.url);
    const search = url.searchParams.get('search');

    let query = db
      .from('groups')
      .select('id, name, description, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('name', `%${search}%`);

    const [groupsRes, groupContactsRes] = await Promise.all([
      query,
      db.from('group_contacts').select('group_id').eq('tenant_id', tenantId)
    ]);

    if (groupsRes.error) throw groupsRes.error;

    const countMap = new Map<string, number>();
    (groupContactsRes.data || []).forEach((gc: any) => {
      countMap.set(gc.group_id, (countMap.get(gc.group_id) || 0) + 1);
    });

    const groupsWithCounts = (groupsRes.data || []).map((g: any) => ({
      ...g,
      contacts_count: countMap.get(g.id) || 0,
    }));

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/groups',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(groupsWithCounts, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch groups', 500, { requestId }), origin);
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
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return withCors(apiError('VALIDATION_ERROR', 'Group name is required.', 400, {
        details: [{ field: 'name', message: 'Name cannot be empty' }],
        requestId
      }), origin);
    }

    const publicId = generatePublicId('g');
    const { data: group, error } = await db
      .from('groups')
      .insert({
        tenant_id: tenantId,
        public_id: publicId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select('id, public_id, name, description, created_at')
      .single();

    if (error) throw error;

    await invalidateGroupsCache(tenantId);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/groups',
      statusCode: 201,
      latencyMs: Date.now() - startTime,
      resourceType: 'group',
      resourceId: group.id,
    });

    return withCors(apiSuccess({ ...group, contacts_count: 0 }, 201, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to create group', 500, { requestId }), origin);
  }
}
