import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { dbAdmin } from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function ensureSupabaseAuthUser(email: string, password: string) {
  try {
    if (!dbAdmin) throw new Error('Supabase admin client unavailable');

    const { data, error } = await dbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      const msg = error.message || '';
      // Treat known duplicate / already-registered variants as non-fatal
      if (/duplicate|already exists|already registered|already been registered|user already exists|email.*already/i.test(msg)) {
        return data;
      }
      throw new Error(msg || 'Unable to create Supabase auth user');
    }

    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/duplicate|already exists|already registered|already been registered|user already exists|email.*already/i.test(message)) {
      return undefined;
    }
    throw err;
  }
}

export async function getSupabaseAuthSession(email: string, password: string): Promise<Session> {
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.session) {
    throw new Error(error?.message || 'Unable to sign in to Supabase');
  }

  return data.session;
}

export async function refreshSupabaseAuthSession(refreshToken: string): Promise<Session> {
  const { data, error } = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data?.session) {
    throw new Error(error?.message || 'Unable to refresh Supabase session');
  }

  return data.session;
}
