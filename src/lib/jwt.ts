import { SignJWT, jwtVerify } from 'jose';

/**
 * Resolves the JWT signing secret.
 * - Production: throws immediately if JWT_SECRET is not set.
 * - Development: logs a loud warning and uses a deterministic dev-only secret.
 *   NEVER ship the dev fallback to production.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[jwt] JWT_SECRET environment variable is required in production. ' +
        'Set it to a random string of at least 32 characters.'
      );
    }
    console.warn('[jwt] WARNING: JWT_SECRET is not set. Using dev-only fallback. This MUST be set in production.');
    return new TextEncoder().encode('dev-only-insecure-jwt-secret-do-not-use-in-production');
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  [key: string]: any;
}

export const signToken = async (payload: JwtPayload) => {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
};

// In-memory cache to save CPU cycles on cryptographically verifying JWTs on consecutive requests
const tokenCache = new Map<string, { payload: JwtPayload | null; expiresAt: number }>();

const cleanupCache = () => {
  if (tokenCache.size > 1000) {
    const now = Date.now();
    for (const [key, val] of tokenCache.entries()) {
      if (val.expiresAt <= now) {
        tokenCache.delete(key);
      }
    }
  }
};

export const verifyToken = async (token: string): Promise<JwtPayload | null> => {
  const cached = tokenCache.get(token);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.payload;
  }

  cleanupCache();

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const decoded = payload as JwtPayload;
    // Cache verified payload for 10 seconds
    tokenCache.set(token, { payload: decoded, expiresAt: now + 10000 });
    return decoded;
  } catch (err) {
    // Cache invalid tokens briefly for 5 seconds to prevent flood requests
    tokenCache.set(token, { payload: null, expiresAt: now + 5000 });
    return null;
  }
};
