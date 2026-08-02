import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev');

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
