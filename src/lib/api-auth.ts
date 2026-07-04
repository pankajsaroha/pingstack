import { createHash } from 'crypto';
import { db } from './db';

/**
 * Computes a secure SHA-256 hash of the API key
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Authenticates a request via its Bearer Token.
 * Returns the tenant_id string if valid, or null.
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
      .select('tenant_id')
      .eq('api_secret_hash', keyHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.tenant_id;
  } catch (err) {
    console.error('[API Auth] Unexpected DB error during API Key auth', err);
    return null;
  }
}
