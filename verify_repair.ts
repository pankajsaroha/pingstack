import { db } from './src/lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyRepairQuery() {
  console.log('Testing repair query...');
  const { data: messages, error } = await db
    .from('messages')
    .select('*, campaigns(templates(name))')
    .eq('status', 'pending')
    .limit(5);

  if (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }

  console.log('✅ Query succeeded!');
  if (messages && messages.length > 0) {
    console.log(`Found ${messages.length} pending messages.`);
    messages.forEach(m => {
       console.log(`ID: ${m.id}, Campaign: ${m.campaign_id}, Template Name: ${(m.campaigns?.templates as any)?.name}`);
    });
  } else {
    console.log('No pending messages to test with.');
  }
  process.exit(0);
}

verifyRepairQuery().catch(err => {
  console.error('Crash:', err);
  process.exit(1);
});
