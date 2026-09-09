import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { invalidateGroupsCache } from '@/lib/server/groups';

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
    const [groupRes, contactsCountRes] = await Promise.all([
      db.from('groups').select('id, name, description, created_at').eq('id', id).eq('tenant_id', tenantId).maybeSingle(),
      db.from('group_contacts').select('contact_id', { count: 'exact', head: true }).eq('group_id', id).eq('tenant_id', tenantId)
    ]);

    if (groupRes.error) throw groupRes.error;
    if (!groupRes.data) {
      return withCors(apiError('NOT_FOUND', `Group with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/groups/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'group',
      resourceId: id,
    });

    return withCors(apiSuccess({
      ...groupRes.data,
      contacts_count: contactsCountRes.count || 0,
    }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch group', 500, { requestId }), origin);
  }
}

export async function PATCH(
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
    const body = await req.json();
    const updatePayload: Record<string, any> = {};

    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.description !== undefined) updatePayload.description = body.description ? String(body.description).trim() : null;

    if (Object.keys(updatePayload).length === 0) {
      return withCors(apiError('VALIDATION_ERROR', 'No updatable fields provided.', 400, { requestId }), origin);
    }

    const { data: updated, error } = await db
      .from('groups')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name, description, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!updated) {
      return withCors(apiError('NOT_FOUND', `Group with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    await invalidateGroupsCache(tenantId);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'PATCH',
      endpoint: `/api/v1/groups/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'group',
      resourceId: id,
    });

    return withCors(apiSuccess(updated, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to update group', 500, { requestId }), origin);
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
    // Delete memberships first
    await db.from('group_contacts').delete().eq('group_id', id).eq('tenant_id', tenantId);

    const { data: deleted, error } = await db
      .from('groups')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) {
      return withCors(apiError('NOT_FOUND', `Group with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    await invalidateGroupsCache(tenantId);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: `/api/v1/groups/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'group',
      resourceId: id,
    });

    return withCors(apiSuccess({ deleted: true, id }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to delete group', 500, { requestId }), origin);
  }
}
