import { Queue, QueueOptions } from 'bullmq';
import { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export function getRedisConfig(): RedisOptions {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(url);
  return {
    host: parsed.hostname || '127.0.0.1',
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  };
}

const connection = getRedisConfig();

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

export const driveSyncQueue = new Queue('drive-sync', defaultQueueOptions);
export const videoProcessingQueue = new Queue('video-processing', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 3,
  },
});
export const aiAnalysisQueue = new Queue('ai-analysis', defaultQueueOptions);
export const contentGenQueue = new Queue('content-generation', defaultQueueOptions);
export const youtubePublishQueue = new Queue('youtube-publishing', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 4,
  },
});
export const instagramPublishQueue = new Queue('instagram-publishing', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 4,
  },
});
export const analyticsSyncQueue = new Queue('analytics-sync', defaultQueueOptions);
export const notificationsQueue = new Queue('notifications', defaultQueueOptions);
