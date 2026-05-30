import { createClient } from '@supabase/supabase-js'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

// Load environment variables for non-Next.js processes (like worker.ts)
if (typeof window === 'undefined') {
  try {
    void import('dotenv').then(d => d.config({ path: '.env.local' }));
  } catch {
    // ignore
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase Public Keys are missing in environment!');
}

// 1. Admin client for Server (uses secret service role key)
// We only initialize this on the server!
export const db: SupabaseClient | null = (typeof window === 'undefined') 
  ? createClient(supabaseUrl, supabaseServiceKey || '', {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

// 2. Standard client for Browser (uses public anon key)
export const dbPublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Deprecated alias
export const dbAdmin = db;

export const setSupabaseSession = async (session: Session | null) : Promise<unknown> => {
  if (!dbPublic?.auth?.setSession) return null;

  if (!session) {
    const res = await dbPublic.auth.signOut();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('supabaseSession');
      } catch {}
    }
    return res;
  }

  const res = await dbPublic.auth.setSession(session);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('supabaseSession', JSON.stringify(session));
    } catch {}
  }

  return res as unknown;
};
