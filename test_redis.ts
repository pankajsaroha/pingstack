import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { 
  maxRetriesPerRequest: null,
  family: 0 
});

async function testAddJob() {
  const queue = new Queue('message-queue', { connection: connection as any });
  console.log(`Adding test job to: ${redisUrl.split('@')[1] || redisUrl}`);
  
  const job = await queue.add('test-job', { 
    messageId: 'test-' + Date.now(),
    phone: '1234567890',
    textContent: 'Test from check script'
  });

  console.log(`Job added! ID: ${job.id}`);
  process.exit(0);
}

testAddJob().catch(err => {
  console.error('Failed to add job:', err);
  process.exit(1);
});
