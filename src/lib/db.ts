import { createClient } from '@supabase/supabase-js'

// This must run before any process.env access
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// Initialize DB client
if (typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Silent init
}
