import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { checkLimit } from '@/lib/limits';
import { normalizePhoneNumber } from '@/lib/phone';
import { invalidateContactsCache } from '@/lib/server/contacts';
import { dispatchDeveloperWebhookEvent } from '@/lib/server/developer-webhooks';

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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
    const offset = (page - 1) * pageSize;
    const search = url.searchParams.get('search');
    const tag = url.searchParams.get('tag');

    let query = db
      .from('contacts')
      .select('id, name, phone_number, email, custom_fields, tags, unread_count, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/contacts',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(data || [], 200, {
      requestId,
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        hasMore: (offset + (data?.length || 0)) < (count || 0),
      }
    }), origin);
  } catch (err: any) {
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/contacts',
      statusCode: 500,
      latencyMs: Date.now() - startTime,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch contacts', 500, { requestId }), origin);
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
    const { name, phone, phone_number, email, custom_fields = {}, tags = [] } = body;

    const rawPhone = phone || phone_number;
    if (!rawPhone) {
      return withCors(apiError('VALIDATION_ERROR', 'Phone number is required.', 400, {
        details: [{ field: 'phone', message: 'Missing phone number' }],
        requestId
      }), origin);
    }

    const cleanPhone = normalizePhoneNumber(String(rawPhone));
    if (!cleanPhone || cleanPhone.length < 10) {
      return withCors(apiError('VALIDATION_ERROR', 'Invalid phone number format.', 400, {
        details: [{ field: 'phone', message: 'Phone number must include country code' }],
        requestId
      }), origin);
    }

    // Check Plan Contact Quota Limit
    const canAddContact = await checkLimit(tenantId, 'contacts');
    if (!canAddContact) {
      return withCors(apiError('LIMIT_EXCEEDED', 'Contact limit reached for your plan. Please upgrade to Growth or Pro.', 403, {
        requestId
      }), origin);
    }

    // Upsert or create contact
    const { data: contact, error } = await db
      .from('contacts')
      .upsert({
        tenant_id: tenantId,
        name: name?.trim() || `Customer ${cleanPhone}`,
        phone_number: cleanPhone,
        email: email?.trim() || null,
        custom_fields,
        tags: Array.isArray(tags) ? tags : [],
      }, { onConflict: 'tenant_id,phone_number' })
      .select('id, name, phone_number, email, custom_fields, tags, created_at')
      .single();

    if (error) throw error;

    await invalidateContactsCache(tenantId);

    dispatchDeveloperWebhookEvent(tenantId, 'contact.created', {
      contact_id: contact.id,
      name: contact.name,
      phone_number: contact.phone_number,
      created_at: contact.created_at,
    }).catch(() => null);

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/contacts',
      statusCode: 201,
      latencyMs: Date.now() - startTime,
      resourceType: 'contact',
      resourceId: contact.id,
    });

    return withCors(apiSuccess(contact, 201, { requestId }), origin);
  } catch (err: any) {
    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/contacts',
      statusCode: 500,
      latencyMs: Date.now() - startTime,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to create contact', 500, { requestId }), origin);
  }
}
