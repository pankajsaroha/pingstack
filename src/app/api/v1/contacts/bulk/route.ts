import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { checkLimit } from '@/lib/limits';
import { normalizePhoneNumber } from '@/lib/phone';
import { invalidateContactsCache } from '@/lib/server/contacts';

export async function OPTIONS(req: Request) {
  return corsPreflightResponse(req);
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
    const contactsInput = Array.isArray(body) ? body : body.contacts;

    if (!Array.isArray(contactsInput) || contactsInput.length === 0) {
      return withCors(apiError('VALIDATION_ERROR', 'Expected an array of contact objects in "contacts".', 400, { requestId }), origin);
    }

    if (contactsInput.length > 500) {
      return withCors(apiError('PAYLOAD_TOO_LARGE', 'Bulk contact creation limit is 500 records per request.', 413, { requestId }), origin);
    }

    // Check contact limit
    const canAdd = await checkLimit(tenantId, 'contacts');
    if (!canAdd) {
      return withCors(apiError('LIMIT_EXCEEDED', 'Contact quota exceeded for your plan.', 403, { requestId }), origin);
    }

    const created: any[] = [];
    const errors: Array<{ index: number; phone?: string; error: string }> = [];

    // Deduplicate and sanitize
    const recordsToUpsert: any[] = [];
    contactsInput.forEach((item, index) => {
      const rawPhone = item.phone || item.phone_number;
      if (!rawPhone) {
        errors.push({ index, error: 'Missing phone number' });
        return;
      }
      const cleanPhone = normalizePhoneNumber(String(rawPhone));
      if (!cleanPhone || cleanPhone.length < 10) {
        errors.push({ index, phone: String(rawPhone), error: 'Invalid phone format' });
        return;
      }

      recordsToUpsert.push({
        tenant_id: tenantId,
        name: item.name?.trim() || `Customer ${cleanPhone}`,
        phone_number: cleanPhone,
        email: item.email?.trim() || null,
        custom_fields: item.custom_fields || {},
        tags: Array.isArray(item.tags) ? item.tags : [],
      });
    });

    if (recordsToUpsert.length > 0) {
      const { data: upserted, error } = await db
        .from('contacts')
        .upsert(recordsToUpsert, { onConflict: 'tenant_id,phone_number' })
        .select('id, name, phone_number, email, custom_fields, tags, created_at');

      if (error) throw error;
      if (upserted) created.push(...upserted);
      await invalidateContactsCache(tenantId);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/contacts/bulk',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess({
      total_submitted: contactsInput.length,
      processed_count: created.length,
      failed_count: errors.length,
      contacts: created,
      errors: errors.length > 0 ? errors : undefined,
    }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to bulk process contacts', 500, { requestId }), origin);
  }
}

export async function DELETE(req: Request) {
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
    const contactIds = body.contact_ids || body.ids;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return withCors(apiError('VALIDATION_ERROR', 'Expected an array of contact IDs in "contact_ids".', 400, { requestId }), origin);
    }

    const { error, count } = await db
      .from('contacts')
      .delete({ count: 'exact' })
      .in('id', contactIds)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    await invalidateContactsCache(tenantId);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: '/api/v1/contacts/bulk',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess({ deleted_count: count || 0 }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to bulk delete contacts', 500, { requestId }), origin);
  }
}
