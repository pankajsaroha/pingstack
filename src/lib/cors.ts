import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Allowed origins for the public developer API (/api/v1/*).
 * In production, restrict this to your known consumer origins.
 * An empty CORS_ALLOWED_ORIGINS env var means "all origins" — acceptable
 * for a public API that requires API key auth on every request.
 */
function getCorsOrigin(requestOrigin: string | null): string {
  const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
  if (!allowedOriginsEnv) {
    // No restriction configured — allow all (still requires API key auth)
    return requestOrigin ?? '*';
  }

  const allowed = allowedOriginsEnv.split(',').map(o => o.trim());
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowed[0]; // Default to first allowed origin
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24-hour preflight cache
} as const;

export function withCors(response: NextResponse, requestOrigin: string | null): NextResponse {
  const origin = getCorsOrigin(requestOrigin);
  response.headers.set('Access-Control-Allow-Origin', origin);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflightResponse(req: NextRequest | Request): NextResponse {
  const origin = (req as Request).headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', getCorsOrigin(origin));
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
