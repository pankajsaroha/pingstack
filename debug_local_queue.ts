import { messageQueue } from './src/lib/queue';

async function checkLocalQueue() {
  // This will use the default REDIS_URL from queue.ts if not overridden correctly
  console.log('Checking Local Redis Queue (or whatever is in env right now)...');
  const count = await messageQueue.count();
  console.log(`Total Jobs: ${count}`);
  process.exit(0);
}

checkLocalQueue();
