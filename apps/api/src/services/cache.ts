import Redis from 'ioredis';
import { CacheKey, CacheEntry } from '@yia/shared';
import { getEnv } from '../utils/env';

const env = getEnv();
const memoryStore = new Map<string, CacheEntry<unknown>>();

const redisClient = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    })
  : null;

const serializeKey = (key: CacheKey) => `${key.videoId}:${key.language}:${key.operation}`;

const ensureRedis = async () => {
  if (!redisClient) return null;
  if (redisClient.status === 'wait') {
    await redisClient.connect();
  }
  return redisClient;
};

export const getCache = async <T>(key: CacheKey): Promise<T | null> => {
  const serialized = serializeKey(key);
  const client = await ensureRedis();
  if (client) {
    const value = await client.get(serialized);
    return value ? (JSON.parse(value) as T) : null;
  }
  const entry = memoryStore.get(serialized);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(serialized);
    return null;
  }
  return entry.value as T;
};

export const setCache = async <T>(key: CacheKey, value: T, ttlSeconds: number): Promise<void> => {
  const serialized = serializeKey(key);
  const client = await ensureRedis();
  if (client) {
    await client.set(serialized, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }
  memoryStore.set(serialized, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
};
