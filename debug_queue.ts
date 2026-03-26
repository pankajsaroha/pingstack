import { messageQueue } from './src/lib/queue';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkQueue() {
  console.log('Checking Railway Redis Queue...');
  const count = await messageQueue.count();
  const waiting = await messageQueue.getWaitingCount();
  const active = await messageQueue.getActiveCount();
  const completed = await messageQueue.getCompletedCount();
  const failed = await messageQueue.getFailedCount();

  console.log(`Total Jobs: ${count}`);
  console.log(`Waiting: ${waiting}`);
  console.log(`Active: ${active}`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

checkQueue().catch(err => {
  console.error(err);
  process.exit(1);
});
