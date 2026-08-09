import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

const publicPaths = [
  '/login', 
  '/register', 
  '/privacy',
  '/forgot-password',
  '/docs',
  '/pricing',
  '/contact',
  '/api/auth/login', 
  '/api/auth/logout',
  '/api/auth/register-tenant', 
  '/api/auth/forgot-password',
  '/api/auth/refresh-supabase',
  '/api/webhook/gupshup',
  '/api/webhooks/meta',
  '/api/support/contact',
  '/api/v1/messages/send', // Public API — auth is handled by API key, not JWT cookie
];

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection via Origin/Referer header validation.
 * Since the JWT token is now httpOnly + sameSite: strict, cross-site requests
 * cannot carry the cookie. We additionally verify the Origin header on
 * state-mutating requests to defence-in-depth against any future misconfigurations.
 */
function validateCsrf(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method)) return true;

  const host = request.headers.get('host');
  if (!host) return false;

  // Allow server-to-server calls (no Origin header = non-browser context or same-origin fetch)
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // If neither Origin nor Referer is present, it's likely a server-side or CLI call — allow
  if (!origin && !referer) return true;

  // Validate Origin header
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  // Fallback: validate Referer header
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // CSRF validation for all non-public mutation requests
  if (pathname.startsWith('/api/') && !validateCsrf(request)) {
    return NextResponse.json(
      { error: 'CSRF validation failed: request origin does not match host' },
      { status: 403 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : request.cookies.get('token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', payload.tenantId);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // Exclude static resources and file extensions from triggering middleware execution
    '/((?!api/webhook/gupshup|api/webhooks/meta|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html|css|js|jpe?g|png|gif|svg|ico|woff2?|map|json|txt)$|login|register|privacy|forgot-password|docs|pricing|contact(?!s)|api/auth/login|api/auth/logout|api/auth/register-tenant|api/auth/forgot-password|api/support/contact).*)'
  ],
};
