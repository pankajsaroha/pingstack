import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let _connection: IORedis | null = null;
function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      family: 0,
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      lazyConnect: true, // Don't establish socket immediately
    });
  }
  return _connection;
}

let _messageQueue: Queue | null = null;
function getMessageQueue(): Queue {
  if (!_messageQueue) {
    _messageQueue = new Queue('message-queue', { connection: getConnection() as any });
  }
  return _messageQueue;
}

let _campaignQueue: Queue | null = null;
function getCampaignQueue(): Queue {
  if (!_campaignQueue) {
    _campaignQueue = new Queue('campaign-queue', { connection: getConnection() as any });
  }
  return _campaignQueue;
}

// Proxies forward all accesses/method calls to the underlying lazy instances
export const connection = new Proxy({} as IORedis, {
  get(target, prop, receiver) {
    const conn = getConnection();
    const value = Reflect.get(conn, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(conn);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    return Reflect.set(getConnection(), prop, value, receiver);
  }
});

export const messageQueue = new Proxy({} as Queue, {
  get(target, prop, receiver) {
    const queue = getMessageQueue();
    const value = Reflect.get(queue, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(queue);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    return Reflect.set(getMessageQueue(), prop, value, receiver);
  }
});

export const campaignQueue = new Proxy({} as Queue, {
  get(target, prop, receiver) {
    const queue = getCampaignQueue();
    const value = Reflect.get(queue, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(queue);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    return Reflect.set(getCampaignQueue(), prop, value, receiver);
  }
});
