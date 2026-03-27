import { db } from './src/lib/db';

async function checkSchema() {
  const { data, error } = await db.from('messages').select('*').limit(1);
  if (error) {
    console.error('Error fetching message:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Sample Message columns:', Object.keys(data[0]));
    console.log('Sample Message data:', data[0]);
  } else {
    console.log('No messages found');
  }
}

checkSchema();
