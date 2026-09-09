import { dbAdmin as db } from '@/lib/db';

export interface ApiLogParams {
  tenantId: string;
  apiKeyId?: string | null;
  requestId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  resourceType?: string | null;
  resourceId?: string | null;
  errorCode?: string | null;
  ipAddress?: string | null;
}

/**
 * Asynchronously records an API request log in Supabase.
 * Fails open so logging errors never disrupt API response cycles.
 */
export async function logApiRequest(params: ApiLogParams): Promise<void> {
  if (!db || !params.tenantId) return;

  try {
    await db.from('api_request_logs').insert({
      tenant_id: params.tenantId,
      api_key_id: params.apiKeyId || null,
      request_id: params.requestId,
      method: params.method.toUpperCase(),
      endpoint: params.endpoint,
      status_code: params.statusCode,
      latency_ms: Math.max(0, Math.round(params.latencyMs)),
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      error_code: params.errorCode || null,
      ip_address: params.ipAddress || null,
    });
  } catch (err: any) {
    // Non-blocking catch
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[API Logger Warning]:', err?.message || err);
    }
  }
}
