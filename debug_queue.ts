import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log(`Checking Redis at: ${redisUrl.split('@')[1] || redisUrl}`);

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

async function checkQueue() {
  const queue = new Queue('message-queue', { connection: connection as any });
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount()
  ]);

  console.log('\n--- Queue Status ---');
  console.log(`Waiting:   ${waiting}`);
  console.log(`Active:    ${active}`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Delayed:   ${delayed}`);

  if (waiting > 0) {
    const jobs = await queue.getWaiting(0, 5);
    console.log('\n--- Sample Waiting Jobs ---');
    jobs.forEach(j => console.log(`Job ID: ${j.id}, Data: ${JSON.stringify(j.data)}`));
  }

  if (active > 0) {
    const jobs = await queue.getActive(0, 5);
    console.log('\n--- Sample Active Jobs ---');
    jobs.forEach(j => console.log(`Job ID: ${j.id}, Data: ${JSON.stringify(j.data)}`));
  }

  process.exit(0);
}

checkQueue().catch(err => {
  console.error('Error checking queue:', err);
  process.exit(1);
});
