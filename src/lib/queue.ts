import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const messageQueue = new Queue('message-queue', { connection: connection as any });
