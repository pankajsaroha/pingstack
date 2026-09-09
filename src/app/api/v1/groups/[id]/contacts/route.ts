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
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
    const offset = (page - 1) * pageSize;

    // Check group exists
    const { data: group } = await db.from('groups').select('id, name').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
    if (!group) {
      return withCors(apiError('NOT_FOUND', `Group with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    const { data: relations, count, error } = await db
      .from('group_contacts')
      .select('contact_id, contacts(id, name, phone_number, email, created_at)', { count: 'exact' })
      .eq('group_id', id)
      .eq('tenant_id', tenantId)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const contacts = (relations || []).map((r: any) => r.contacts).filter(Boolean);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/groups/${id}/contacts`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(contacts, 200, {
      requestId,
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        hasMore: (offset + (relations?.length || 0)) < (count || 0),
      }
    }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch group contacts', 500, { requestId }), origin);
  }
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
    const body = await req.json();
    const contactIds = body.contact_ids || (body.contact_id ? [body.contact_id] : []);

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return withCors(apiError('VALIDATION_ERROR', 'Expected array of "contact_ids".', 400, { requestId }), origin);
    }

    // Verify group exists
    const { data: group } = await db.from('groups').select('id').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
    if (!group) {
      return withCors(apiError('NOT_FOUND', `Group with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    // Verify contacts belong to this tenant
    const { data: validContacts } = await db
      .from('contacts')
      .select('id')
      .in('id', contactIds)
      .eq('tenant_id', tenantId);

    const validIds = (validContacts || []).map((c: any) => c.id);
    if (validIds.length === 0) {
      return withCors(apiError('NOT_FOUND', 'None of the provided contact IDs exist in your workspace.', 404, { requestId }), origin);
    }

    const rowsToInsert = validIds.map(cid => ({
      tenant_id: tenantId,
      group_id: id,
      contact_id: cid,
    }));

    await db.from('group_contacts').upsert(rowsToInsert, { onConflict: 'group_id,contact_id' });
    await invalidateGroupsCache(tenantId);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: `/api/v1/groups/${id}/contacts`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess({ added_count: validIds.length, group_id: id }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to add contacts to group', 500, { requestId }), origin);
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
    const body = await req.json();
    const contactIds = body.contact_ids || (body.contact_id ? [body.contact_id] : []);

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return withCors(apiError('VALIDATION_ERROR', 'Expected array of "contact_ids".', 400, { requestId }), origin);
    }

    const { error, count } = await db
      .from('group_contacts')
      .delete({ count: 'exact' })
      .eq('group_id', id)
      .eq('tenant_id', tenantId)
      .in('contact_id', contactIds);

    if (error) throw error;
    await invalidateGroupsCache(tenantId);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: `/api/v1/groups/${id}/contacts`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess({ removed_count: count || 0, group_id: id }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to remove contacts from group', 500, { requestId }), origin);
  }
}
