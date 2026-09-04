import { headers, cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string | null;
  isSuperAdmin: boolean;
}

// Configurable platform admins (defaulting to Pingstack system administrators)
const DEFAULT_SUPERADMIN_EMAILS = [
  'info@pingstack.in',
  'vk2691777@gmail.com',
];

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  
  const envAdmins = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : [];

  return DEFAULT_SUPERADMIN_EMAILS.includes(clean) || envAdmins.includes(clean);
}

/**
 * Server-side verification for React Server Components (RSC) and layouts.
 * Inspects request headers and verifies the user's admin privilege directly against the database.
 */
export async function getAdminServer(): Promise<AdminUser | null> {
  try {
    const reqHeaders = await headers();
    let userId = reqHeaders.get('x-user-id');
    let userRole = reqHeaders.get('x-user-role');

    // Fallback: If headers are not present, verify JWT token from cookies
    if (!userId) {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.userId) {
          userId = payload.userId;
          userRole = payload.role;
        }
      }
    }

    if (!userId || !db) {
      return null;
    }

    // Always verify against DB to prevent privilege spoofing
    const { data: user, error } = await db
      .from('users')
      .select('id, email, name, role, tenant_id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return null;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || isPlatformAdminEmail(user.email);
    if (!isAdmin) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: user.role || 'admin',
      tenant_id: user.tenant_id,
      isSuperAdmin: isPlatformAdminEmail(user.email) || user.role === 'superadmin',
    };
  } catch (err) {
    console.error('[getAdminServer] Authorization error:', err);
    return null;
  }
}

/**
 * Verifies admin permissions for API Route Handlers.
 * Returns either the authenticated admin object or a NextResponse with 401/403.
 */
export async function verifyAdminApi(req: Request): Promise<{ admin: AdminUser | null; errorResponse?: NextResponse }> {
  try {
    let userId = req.headers.get('x-user-id');
    let userRole = req.headers.get('x-user-role');

    if (!userId) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];

      if (token) {
        const payload = await verifyToken(token);
        if (payload?.userId) {
          userId = payload.userId;
          userRole = payload.role;
        }
      }
    }

    if (!userId || !db) {
      return {
        admin: null,
        errorResponse: NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 }),
      };
    }

    const { data: user, error } = await db
      .from('users')
      .select('id, email, name, role, tenant_id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return {
        admin: null,
        errorResponse: NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 }),
      };
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || isPlatformAdminEmail(user.email);
    if (!isAdmin) {
      return {
        admin: null,
        errorResponse: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
      };
    }

    return {
      admin: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role || 'admin',
        tenant_id: user.tenant_id,
        isSuperAdmin: isPlatformAdminEmail(user.email) || user.role === 'superadmin',
      },
    };
  } catch (err) {
    console.error('[verifyAdminApi] Error:', err);
    return {
      admin: null,
      errorResponse: NextResponse.json({ error: 'Internal server error during authorization' }, { status: 500 }),
    };
  }
}
