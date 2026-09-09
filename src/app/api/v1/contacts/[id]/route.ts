import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { invalidateContactsCache } from '@/lib/server/contacts';
import { dispatchDeveloperWebhookEvent } from '@/lib/server/developer-webhooks';
import { normalizePhoneNumber } from '@/lib/phone';

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
    const { data: contact, error } = await db
      .from('contacts')
      .select('id, name, phone_number, email, custom_fields, tags, unread_count, created_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!contact) {
      return withCors(apiError('NOT_FOUND', `Contact with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: `/api/v1/contacts/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'contact',
      resourceId: id,
    });

    return withCors(apiSuccess(contact, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch contact', 500, { requestId }), origin);
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
    if (body.email !== undefined) updatePayload.email = body.email ? String(body.email).trim() : null;
    if (body.tags !== undefined) updatePayload.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.custom_fields !== undefined) updatePayload.custom_fields = body.custom_fields;

    if (body.phone || body.phone_number) {
      const cleanPhone = normalizePhoneNumber(String(body.phone || body.phone_number));
      if (cleanPhone && cleanPhone.length >= 10) {
        updatePayload.phone_number = cleanPhone;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return withCors(apiError('VALIDATION_ERROR', 'No updatable fields provided.', 400, { requestId }), origin);
    }

    const { data: updated, error } = await db
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name, phone_number, email, custom_fields, tags, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!updated) {
      return withCors(apiError('NOT_FOUND', `Contact with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    await invalidateContactsCache(tenantId);

    dispatchDeveloperWebhookEvent(tenantId, 'contact.updated', {
      contact_id: updated.id,
      name: updated.name,
      phone_number: updated.phone_number,
      updated_fields: Object.keys(updatePayload),
    }).catch(() => null);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'PATCH',
      endpoint: `/api/v1/contacts/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'contact',
      resourceId: id,
    });

    return withCors(apiSuccess(updated, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to update contact', 500, { requestId }), origin);
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
    const { data: deleted, error } = await db
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name, phone_number')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) {
      return withCors(apiError('NOT_FOUND', `Contact with ID "${id}" was not found.`, 404, { requestId }), origin);
    }

    await invalidateContactsCache(tenantId);

    dispatchDeveloperWebhookEvent(tenantId, 'contact.deleted', {
      contact_id: deleted.id,
      phone_number: deleted.phone_number,
    }).catch(() => null);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: `/api/v1/contacts/${id}`,
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'contact',
      resourceId: id,
    });

    return withCors(apiSuccess({ deleted: true, id }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to delete contact', 500, { requestId }), origin);
  }
}
