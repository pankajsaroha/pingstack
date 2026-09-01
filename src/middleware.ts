import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

const publicPaths = [
  '/login', 
  '/register', 
  '/forgot-password',
  '/docs',
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
  '/api/health', // Health check endpoint for deployment monitoring
];

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection via Origin/Referer header validation.
 * Since the JWT token is httpOnly + sameSite: strict, cross-site requests
 * cannot carry the cookie. We additionally verify the Origin header on
 * state-mutating requests to defence-in-depth against any future misconfigurations.
 */
function validateCsrf(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method)) return true;

  const host = request.headers.get('host');
  if (!host) return false;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) return true;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

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

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : request.cookies.get('token')?.value;

  const authPagePaths = ['/login', '/register', '/forgot-password'];

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      // If user is already authenticated and tries to visit /login, /register, or /forgot-password:
      // Redirect them straight to /dashboard!
      if (authPagePaths.includes(pathname)) {
        const dashboardUrl = new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }

      if (publicPaths.includes(pathname)) {
        return NextResponse.next();
      }

      // CSRF validation for non-public API mutation requests
      if (pathname.startsWith('/api/') && !validateCsrf(request)) {
        return NextResponse.json(
          { error: 'CSRF validation failed: request origin does not match host' },
          { status: 403 }
        );
      }

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-id', payload.tenantId);
      requestHeaders.set('x-user-id', payload.userId);
      requestHeaders.set('x-user-role', payload.role);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Prevent browser back-button caching (BFCache) of protected routes
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;
    }
  }

  // Token is missing or invalid
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

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redirectRes = NextResponse.redirect(new URL('/login', request.url));
  redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return redirectRes;
}

export const config = {
  matcher: [
    // Exclude static resources and unauthenticated auth routes from middleware execution
    '/((?!api/webhook/gupshup|api/webhooks/meta|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html|css|js|jpe?g|png|gif|svg|ico|woff2?|map|json|txt)$|login|register|forgot-password|docs|contact(?!s)|api/auth/login|api/auth/logout|api/auth/register-tenant|api/auth/forgot-password|api/support/contact).*)'
  ],
};
