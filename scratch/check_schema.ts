
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking Tenants ---');
  const { data: t } = await db.from('tenants').select('*').limit(1);
  if (t && t[0]) console.log(Object.keys(t[0]));

  console.log('--- Checking Messages ---');
  const { data: m } = await db.from('messages').select('*').limit(1);
  if (m && m[0]) console.log(Object.keys(m[0]));
}
check();
