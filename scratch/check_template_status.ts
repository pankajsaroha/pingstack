
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await db.from('templates').select('status').limit(20);
  if (error) {
    console.error('Error:', error);
    return;
  }
  const statuses = Array.from(new Set(data?.map(t => t.status)));
  console.log('Unique template statuses found:', statuses);
  console.log('Sample rows:', data);
}
check();
