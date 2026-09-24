import { Queue, QueueOptions } from 'bullmq';
import { getRedisConfig } from '../config/redis.js';

const connection = getRedisConfig();

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 30000, // 30s initial, then 120s (2m), 300s (5m), 900s (15m)
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
