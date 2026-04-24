
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from both standard and .local since we're in dev
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const db = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('🔍 Checking latest failed messages...');
  const { data, error } = await db
    .from('messages')
    .select('id, phone_number, status, error, created_at, content')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error fetching messages:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ No failed messages found. (Wait, the user said there are?)');
    
    // Check all messages just in case
    const { data: all } = await db.from('messages').select('status').limit(10);
    console.log('Recent message statuses:', all?.map(m => m.status));
    return;
  }

  console.log('--- FAILED MESSAGES ---');
  data.forEach((m, i) => {
    console.log(`\n[${i+1}] ID: ${m.id}`);
    console.log(`    To: ${m.phone_number}`);
    console.log(`    Time: ${m.created_at}`);
    console.log(`    Error: ${m.error || 'No error details found'}`);
    console.log(`    Content: ${m.content}`);
  });
}

debug();
