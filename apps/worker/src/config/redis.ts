import { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export function getRedisConfig(): RedisOptions {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Support both url string parsing and individual params
  const parsed = new URL(url);
  return {
    host: parsed.hostname || '127.0.0.1',
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      // Exponential backoff with ceiling
      return Math.min(times * 100, 3000);
    },
  };
}
