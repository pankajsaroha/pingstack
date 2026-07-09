const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: tenants } = await db.from('tenants').select('id, name');
  for (const t of tenants || []) {
    const { data: messages } = await db.from('messages').select('id, contact_id, direction, message_type, content, status').eq('tenant_id', t.id);
    if (messages && messages.length > 0) {
      console.log(`\nTenant: "${t.name}" (ID: ${t.id})`);
      console.log("Messages count:", messages.length);
      messages.forEach(m => {
        console.log(`  ContactId: ${m.contact_id} | Type: ${m.message_type} | Dir: ${m.direction} | Status: ${m.status} | Content: ${m.content ? m.content.substring(0, 40) : 'null'}`);
      });
      const uniqueContacts = new Set(messages.map(m => m.contact_id));
      console.log("Unique Contact IDs:", Array.from(uniqueContacts));
    }
  }
}

run();
