import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { verifyPassword } from '@/lib/hash';
import { ensureSupabaseAuthUser, getSupabaseAuthSession } from '@/lib/supabase-auth';
import type { Session } from '@supabase/supabase-js';

type LoginUser = {
  id: string;
  tenant_id: string | null;
  email: string;
  password_hash: string;
  role: string | null;
};

export async function POST(req: Request) {
  try {
    if (!db) {
      console.error('[auth/login] database client is not initialized');
      return NextResponse.json({ error: 'Server error: database client unavailable' }, { status: 500 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim();
    const normalizedPassword = String(password);
    const lookupEmail = normalizedEmail.toLowerCase();

    // Use maybeSingle() to return null instead of error when user not found
    const { data: userData, error: queryError } = await db.from('users').select('*').eq('email', lookupEmail).maybeSingle();
    const user = userData as LoginUser | null;

    if (queryError) {
      console.error('[auth/login] database query error:', queryError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.debug('[auth/login] attempt for', lookupEmail);

    const isBcryptHash = (hash: string) => typeof hash === 'string' && /^\$2[aby]\$\d{2}\$/.test(hash);

    const validatePassword = async (candidate: string, hash: unknown): Promise<boolean> => {
      if (typeof hash !== 'string') return false;
      try {
        if (isBcryptHash(hash)) {
          return await verifyPassword(candidate, hash);
        }
        // Attempt bcrypt compare in case the hash uses a valid bcrypt format that our regex missed
        const bcryptCompare = await verifyPassword(candidate, hash).catch(() => false);
        if (bcryptCompare) return true;
      } catch {
        // ignore and fallback to plaintext compare
      }
      return candidate === hash;
    };

    let isValid = false;
    let authenticatedUser = user;

    // Step 1: Try local password verification if user exists locally
    if (user && user.password_hash) {
      isValid = await validatePassword(normalizedPassword, user.password_hash);
      console.debug('[auth/login] local verify:', isValid ? 'ok' : 'failed');

      if (isValid && !isBcryptHash(user.password_hash)) {
        try {
          const newHash = await import('@/lib/hash').then(m => m.hashPassword(normalizedPassword));
          await db.from('users').update({ password_hash: newHash }).eq('id', user.id);
          console.debug('[auth/login] upgraded legacy password hash for', lookupEmail);
        } catch (upgradeErr) {
          console.warn('[auth/login] failed to upgrade password hash', upgradeErr);
        }
      }
    }

    // Step 2: If local verification failed or user doesn't exist, try Supabase auth
    let supabaseSession: Session | null = null;
    if (!isValid) {
      console.debug('[auth/login] local auth failed or user not found, trying supabase for', lookupEmail);
      // Try Supabase sign-in with retries
      let attempts = 0;
      while (attempts < 2 && !supabaseSession) {
        attempts += 1;
        try {
          console.debug(`[auth/login] trying supabase signin attempt ${attempts} for ${lookupEmail}`);
          supabaseSession = await getSupabaseAuthSession(lookupEmail, normalizedPassword);
        } catch (err) {
          console.debug('[auth/login] supabase signin failed attempt', attempts, err instanceof Error ? err.message : String(err));
          await new Promise(res => setTimeout(res, 150));
        }
      }

      if (supabaseSession) {
        isValid = true;
        console.debug('[auth/login] supabase signin successful for', lookupEmail);

        // Step 3: If user doesn't exist locally but Supabase auth succeeded, create/update local user
        if (!user) {
          try {
            const passwordHash = await import('@/lib/hash').then(m => m.hashPassword(normalizedPassword));
            // Get the first existing tenant or use default
            const { data: firstTenant } = await db.from('tenants')
              .select('id')
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            const tenantIdForNewUser = firstTenant?.id || 'default';

            const { data: newUserData, error: createErr } = await db.from('users').insert({
              name: lookupEmail.split('@')[0] || lookupEmail,
              email: lookupEmail,
              password_hash: passwordHash,
              tenant_id: tenantIdForNewUser,
              role: 'user'
            }).select('*').single();
            const newUser = newUserData as LoginUser | null;

            if (createErr) {
              console.warn('[auth/login] failed to create local user from supabase auth:', createErr);
              // Continue anyway - we have Supabase session
            } else if (newUser) {
              authenticatedUser = newUser;
              console.debug('[auth/login] created local user from supabase auth for', lookupEmail);
            }
          } catch (createErr) {
            console.warn('[auth/login] exception creating local user:', createErr);
            // Continue anyway - we have Supabase session
          }
        } else if (user && !isBcryptHash(user.password_hash)) {
          // User exists locally but has non-bcrypt hash - upgrade it
          try {
            const newHash = await import('@/lib/hash').then(m => m.hashPassword(normalizedPassword));
            await db.from('users').update({ password_hash: newHash }).eq('id', user.id);
            console.debug('[auth/login] synced local password hash for', lookupEmail);
          } catch (syncErr) {
            console.warn('[auth/login] failed to sync password hash', syncErr);
          }
        }
      } else {
        console.debug('[auth/login] supabase signin did not return a session');
      }
    }

    if (!isValid) {
      console.warn('[auth/login] invalid credentials for', lookupEmail);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Use authenticated user data (either from local or created from supabase)
    if (!authenticatedUser) {
      console.error('[auth/login] no authenticated user data available');
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }

    const token = await signToken({
      userId: authenticatedUser.id,
      tenantId: authenticatedUser.tenant_id || 'default',
      role: authenticatedUser.role || 'user'
    });

    // Ensure Supabase user exists (harmless if already present)
    try {
      await ensureSupabaseAuthUser(lookupEmail, normalizedPassword);
      if (!supabaseSession) supabaseSession = await getSupabaseAuthSession(lookupEmail, normalizedPassword);
    } catch {
      // ignore errors here; non-fatal
    }

    const response = NextResponse.json({ token, supabaseSession });
    const refreshToken = supabaseSession?.refresh_token;

    if (refreshToken) {
      response.cookies.set('supabase_refresh_token', String(refreshToken), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
