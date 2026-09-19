let cachedTokenPromise: Promise<string | null> | null = null;
let cachedToken: { token: string; tenantId: string; expiresAt: number } | null = null;

/**
 * Retrieve a signed Supabase Realtime JWT token for the active tenant session.
 * Deduplicates in-flight calls and caches the token for up to 45 minutes to prevent redundant requests.
 */
export async function getRealtimeToken(tenantId: string): Promise<string | null> {
  if (!tenantId) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.tenantId === tenantId && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }
  if (cachedTokenPromise) {
    return cachedTokenPromise;
  }
  cachedTokenPromise = (async () => {
    try {
      const res = await fetch('/api/realtime/token', { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.token) {
        cachedToken = {
          token: data.token,
          tenantId,
          expiresAt: now + 45 * 60 * 1000,
        };
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      cachedTokenPromise = null;
    }
  })();
  return cachedTokenPromise;
}
