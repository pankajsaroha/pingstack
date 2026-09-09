import { createHash } from 'crypto';
import { dbAdmin as db } from './db';
import { apiError } from './server/api-response';
import { NextResponse } from 'next/server';

/**
 * Computes a secure SHA-256 hash of the API key
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export interface ApiAuthContext {
  tenantId: string;
  apiKeyId: string;
  keyPrefix: string;
  appName: string;
}

export interface ApiAuthResult {
  authenticated: boolean;
  context?: ApiAuthContext;
  errorResponse?: NextResponse;
}

/**
 * Authenticates a request via its Bearer Token.
 * Returns the tenant_id string if valid, or null. (Backward compatible)
 */
export async function authenticateApiKey(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const key = authHeader.substring(7).trim();
  if (!key) return null;

  const keyHash = hashApiKey(key);

  if (!db) {
    console.error('[API Auth] DB client not initialized');
    return null;
  }

  try {
    const { data, error } = await db
      .from('developer_apps')
      .select('id, tenant_id, status')
      .eq('api_secret_hash', keyHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    if (data.status && data.status !== 'active') {
      return null;
    }

    // Asynchronously update last_used_at timestamp
    (async () => {
      try {
        await db.from('developer_apps')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', data.id);
      } catch {}
    })();

    return data.tenant_id;
  } catch (err) {
    console.error('[API Auth] Unexpected DB error during API Key auth', err);
    return null;
  }
}

/**
 * Comprehensive Developer API authentication helper with structured error responses.
 */
export async function authenticateDeveloperRequest(
  req: Request,
  requestId: string
): Promise<ApiAuthResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      errorResponse: apiError(
        'UNAUTHORIZED',
        'Authentication required. Provide a valid Bearer token in the Authorization header (e.g. Authorization: Bearer ps_secret_live_...).',
        401,
        { requestId }
      )
    };
  }

  const key = authHeader.substring(7).trim();
  if (!key) {
    return {
      authenticated: false,
      errorResponse: apiError(
        'UNAUTHORIZED',
        'API key token is empty.',
        401,
        { requestId }
      )
    };
  }

  const keyHash = hashApiKey(key);

  if (!db) {
    return {
      authenticated: false,
      errorResponse: apiError(
        'INTERNAL_SERVER_ERROR',
        'Database connection unavailable during authentication.',
        500,
        { requestId }
      )
    };
  }

  try {
    const { data, error } = await db
      .from('developer_apps')
      .select('id, tenant_id, name, api_key_prefix, status')
      .eq('api_secret_hash', keyHash)
      .maybeSingle();

    if (error || !data) {
      return {
        authenticated: false,
        errorResponse: apiError(
          'UNAUTHORIZED',
          'Invalid API key provided.',
          401,
          { requestId }
        )
      };
    }

    if (data.status && data.status !== 'active') {
      return {
        authenticated: false,
        errorResponse: apiError(
          'FORBIDDEN',
          'This API key has been revoked or deactivated.',
          403,
          { requestId }
        )
      };
    }

    // Asynchronously record last_used_at
    (async () => {
      try {
        await db.from('developer_apps')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', data.id);
      } catch {}
    })();

    return {
      authenticated: true,
      context: {
        tenantId: data.tenant_id,
        apiKeyId: data.id,
        keyPrefix: data.api_key_prefix,
        appName: data.name
      }
    };
  } catch (err: any) {
    console.error('[API Auth] Error verifying token:', err);
    return {
      authenticated: false,
      errorResponse: apiError(
        'INTERNAL_SERVER_ERROR',
        'An error occurred during authentication.',
        500,
        { requestId }
      )
    };
  }
}
