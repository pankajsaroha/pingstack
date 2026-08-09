import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
if (process.env.DEBUG_REDIS === 'true') {
  const maskedUrl = redisUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`[Queue Init] Active REDIS_URL: ${maskedUrl}`);
}

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  family: 0,
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
});

// Handle connection errors to prevent Node.js process crashes.
// Silences terminal output in local development, but logs errors in production for visibility.
connection.on('error', (err) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis Connection Error]:', err.message || err);
  }
});

// Intercept duplicate method (used by BullMQ) to ensure all internal clients catch errors safely
const originalDuplicate = connection.duplicate.bind(connection);
connection.duplicate = function(overrideOptions?: any) {
  const duplicated = originalDuplicate(overrideOptions);
  duplicated.on('error', (err: any) => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Redis Duplicated Connection Error]:', err.message || err);
    }
  });
  return duplicated;
};

// Messaging Queue with automatic exponential backoff retries
export const messageQueue = new Queue('message-queue', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: false, // Keep failed jobs in Redis so they can be inspected/retried from DLQ
  },
});

// Campaign Bulk Pipeline Queue
export const campaignQueue = new Queue('campaign-queue', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 500,
    removeOnFail: false,
  },
});

// Dead Letter Queue for capturing permanently failed message jobs
export const deadLetterQueue = new Queue('dead-letter-queue', {
  connection: connection as any,
  defaultJobOptions: {
    removeOnComplete: 5000,
    removeOnFail: false,
  },
});

messageQueue.on('error', (err) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Message Queue Error]:', err.message || err);
  }
});

campaignQueue.on('error', (err) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Campaign Queue Error]:', err.message || err);
  }
});

deadLetterQueue.on('error', (err) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Dead Letter Queue Error]:', err.message || err);
  }
});
