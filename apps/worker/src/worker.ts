import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { getRedisConfig } from './config/redis.js';
import { processDriveSync } from './processors/driveSyncProcessor.js';
import { processVideo } from './processors/videoProcessor.js';
import { processAiAnalysis } from './processors/aiAnalysisProcessor.js';
import { processContentGen } from './processors/contentGenProcessor.js';
import { processYouTubePublish } from './processors/youtubePublishProcessor.js';
import { processInstagramPublish } from './processors/instagramPublishProcessor.js';
import { processNotification } from './processors/notificationProcessor.js';
import { processAnalyticsSync } from './processors/analyticsSyncProcessor.js';

dotenv.config();

const connection = getRedisConfig();
const workers: Worker[] = [];

function createWorker<T>(queueName: string, processor: any, concurrency = 2): Worker {
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`[Queue: ${queueName}] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Queue: ${queueName}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[Queue: ${queueName}] Worker error:`, err.message);
  });

  workers.push(worker);
  return worker;
}

export function startWorkers() {
  console.log('🚀 Starting MUZA BullMQ background workers...');

  createWorker('drive-sync', processDriveSync, 2);
  createWorker('video-processing', processVideo, 2);
  createWorker('ai-analysis', processAiAnalysis, 3);
  createWorker('content-generation', processContentGen, 3);
  createWorker('youtube-publishing', processYouTubePublish, 2);
  createWorker('instagram-publishing', processInstagramPublish, 2);
  createWorker('notifications', processNotification, 5);
  createWorker('analytics-sync', processAnalyticsSync, 1);

  console.log('✅ All 8 BullMQ workers initialized and listening for jobs.');
}

async function shutdown() {
  console.log('🛑 Shutting down workers gracefully...');
  await Promise.all(workers.map((w) => w.close()));
  console.log('✅ All workers closed.');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Auto-start when executed directly
startWorkers();
