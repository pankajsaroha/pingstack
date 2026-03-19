import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendWhatsAppMessage } from './src/lib/gupshup';
import { db } from './src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const worker = new Worker('message-queue', async (job: Job) => {
  const { messageId, phone, templateId, params } = job.data;

  console.log(`Processing message ${messageId} for ${phone}`);
  const result = await sendWhatsAppMessage(phone, templateId, params);

  if (result.success) {
    await db.from('messages')
      .update({ status: 'sent', provider_message_id: result.messageId })
      .eq('id', messageId);
  } else {
    await db.from('messages')
      .update({ status: 'failed', error: result.error })
      .eq('id', messageId);
      
    // Throwing error allows BullMQ to retry depending on job config
    throw new Error(result.error);
  }
}, { connection: connection as any });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});

console.log('Worker is running and waiting for jobs on message-queue...');
