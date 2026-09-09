import { dbAdmin as db } from '@/lib/db';
import { authenticateDeveloperRequest, hashApiKey } from '@/lib/api-auth';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { apiSuccess, apiError, generateRequestId } from '@/lib/server/api-response';
import { logApiRequest } from '@/lib/server/api-logger';
import { randomBytes } from 'crypto';

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
    const { data: keys, error } = await db
      .from('developer_apps')
      .select('id, name, description, api_key_prefix, status, last_used_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'GET',
      endpoint: '/api/v1/keys',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
    });

    return withCors(apiSuccess(keys || [], 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to fetch API keys', 500, { requestId }), origin);
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
      return withCors(apiError('VALIDATION_ERROR', 'Key label "name" is required.', 400, {
        details: [{ field: 'name', message: 'Name cannot be empty' }],
        requestId
      }), origin);
    }

    const rawSecret = randomBytes(24).toString('hex');
    const plaintextKey = `ps_secret_live_${rawSecret}`;
    const hash = hashApiKey(plaintextKey);
    const prefix = `${plaintextKey.substring(0, 15)}...`;

    const { data: keyRecord, error } = await db
      .from('developer_apps')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        description: description?.trim() || null,
        api_key_prefix: prefix,
        api_secret_hash: hash,
        status: 'active',
      })
      .select('id, name, description, api_key_prefix, status, created_at')
      .single();

    if (error) throw error;

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'POST',
      endpoint: '/api/v1/keys',
      statusCode: 201,
      latencyMs: Date.now() - startTime,
      resourceType: 'api_key',
      resourceId: keyRecord.id,
    });

    return withCors(apiSuccess({
      ...keyRecord,
      api_key: plaintextKey,
      note: 'Save this API key now. It will not be shown in full again for security.'
    }, 201, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to create API key', 500, { requestId }), origin);
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
    const url = new URL(req.url);
    const keyId = url.searchParams.get('id');

    if (!keyId) {
      return withCors(apiError('VALIDATION_ERROR', 'Missing query param "id".', 400, { requestId }), origin);
    }

    const { data: deleted, error } = await db
      .from('developer_apps')
      .delete()
      .eq('id', keyId)
      .eq('tenant_id', tenantId)
      .select('id, name')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) {
      return withCors(apiError('NOT_FOUND', `API key with ID "${keyId}" was not found.`, 404, { requestId }), origin);
    }

    logApiRequest({
      tenantId,
      apiKeyId,
      requestId,
      method: 'DELETE',
      endpoint: '/api/v1/keys',
      statusCode: 200,
      latencyMs: Date.now() - startTime,
      resourceType: 'api_key',
      resourceId: keyId,
    });

    return withCors(apiSuccess({ revoked: true, id: keyId }, 200, { requestId }), origin);
  } catch (err: any) {
    return withCors(apiError('INTERNAL_SERVER_ERROR', err?.message || 'Failed to revoke API key', 500, { requestId }), origin);
  }
}
