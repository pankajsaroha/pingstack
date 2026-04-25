import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const msgId = '1609937c-6c3a-4f24-94fc-1a6526c3c4fc';
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', msgId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- DATABASE RECORD ---');
  console.log(JSON.stringify(data, null, 2));
}

check();
