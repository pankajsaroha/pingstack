import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// We use the service role key to bypass RLS, ensuring we can confidently query
// the database. Since we handle multi-tenancy manually in our queries via tenant_id,
// we do not strictly rely on RLS logic for isolating data at the DB level, 
// though doing so is possible. We just enforce it at the application layer.
export const db = createClient(supabaseUrl || 'https://mock.supabase.co', supabaseServiceKey || 'mock-key')
