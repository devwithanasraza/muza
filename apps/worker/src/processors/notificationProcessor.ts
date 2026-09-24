import { Job } from 'bullmq';
import { prisma } from '@muza/database';

export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  link?: string;
  metadata?: Record<string, any>;
}

export async function processNotification(job: Job<NotificationJobData>): Promise<{ id: string }> {
  const { userId, title, message, type, link, metadata } = job.data;

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type || 'INFO',
      link,
      metadata: metadata || {},
    },
  });

  return { id: notification.id };
}
