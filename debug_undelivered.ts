import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const db = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log('Checking last 5 messages...');
  const { data, error } = await db
    .from('messages')
    .select('id, status, error, provider_message_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

checkMessages();
