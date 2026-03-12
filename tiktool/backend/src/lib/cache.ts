import { createClient } from 'redis';
import { config } from '../config/default';
import { logger } from './logger';

const memCache = new Map<string, { value: string; expiresAt: number }>();

let redisClient: ReturnType<typeof createClient> | null = null;

export async function initCache() {
  if (config.redisUrl) {
    try {
      redisClient = createClient({ url: config.redisUrl });
      redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
      await redisClient.connect();
      logger.info('Redis cache connected');
    } catch (err) {
      logger.warn({ err }, 'Redis unavailable, using in-memory cache');
      redisClient = null;
    }
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (redisClient) {
    return redisClient.get(key);
  }
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number) {
  if (redisClient) {
    await redisClient.set(key, value, { EX: ttlSeconds });
    return;
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
