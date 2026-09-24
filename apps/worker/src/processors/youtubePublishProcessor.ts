import { Job } from 'bullmq';
import { prisma, VideoStatus, SocialPlatform, PublishJobStatus } from '@muza/database';
import { AuditAction, YouTubePrivacy } from '@muza/shared';
import { youtubeService, decrypt } from '@muza/integrations';
import { notificationsQueue } from '@muza/queues';

export interface YouTubePublishJobData {
  publishJobId: string;
  videoId: string;
  contentVariantId: string;
  socialAccountId: string;
  userId: string;
}

export async function processYouTubePublish(job: Job<YouTubePublishJobData>): Promise<{ videoUrl: string; externalPostId: string }> {
  const { publishJobId, videoId, contentVariantId, socialAccountId, userId } = job.data;
  console.log(`[YouTubePublish] Processing upload for job ${publishJobId}, video ${videoId}`);

  // 1. Idempotency verification: Check if post has already been published
  const existingPublished = await prisma.publishedPost.findFirst({
    where: {
      videoId,
      socialAccountId,
      platform: SocialPlatform.YOUTUBE,
    },
  });

  if (existingPublished) {
    console.warn(`[YouTubePublish] Idempotency safeguard triggered: Video ${videoId} is already published on YouTube (ID: ${existingPublished.externalPostId}).`);
    await prisma.publishJob.update({
      where: { id: publishJobId },
      data: { status: PublishJobStatus.SUCCESS },
    });
    return {
      videoUrl: existingPublished.externalUrl || `https://www.youtube.com/watch?v=${existingPublished.externalPostId}`,
      externalPostId: existingPublished.externalPostId,
    };
  }

  // 2. Load records
  const publishJob = await prisma.publishJob.findUnique({
    where: { id: publishJobId },
    include: {
      video: true,
      contentVariant: true,
      socialAccount: true,
    },
  });

  if (!publishJob) {
    throw new Error(`Publish job ${publishJobId} not found.`);
  }

  if (!publishJob.video.localPath) {
    throw new Error(`Video file path is missing for video ${videoId}. Re-process the video.`);
  }

  // Record attempt
  const attemptNumber = publishJob.attemptCount + 1;
  const attempt = await prisma.publishAttempt.create({
    data: {
      publishJobId,
      attemptNumber,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  await prisma.publishJob.update({
    where: { id: publishJobId },
    data: {
      status: PublishJobStatus.PROCESSING,
      attemptCount: attemptNumber,
    },
  });

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.PUBLISHING },
  });

  // 3. Check integration configuration
  if (!youtubeService.isConfigured()) {
    const errorMsg = 'Integration not configured: YouTube API credentials (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET) are missing.';
    await markJobFailed(publishJobId, attempt.id, errorMsg, videoId, userId);
    throw new Error(errorMsg);
  }

  try {
    const accessToken = decrypt(publishJob.socialAccount.accessTokenEncrypted);
    const refreshToken = publishJob.socialAccount.refreshTokenEncrypted
      ? decrypt(publishJob.socialAccount.refreshTokenEncrypted)
      : null;

    const tokens = {
      accessToken,
      refreshToken,
      expiryDate: publishJob.socialAccount.tokenExpiresAt ? publishJob.socialAccount.tokenExpiresAt.getTime() : undefined,
    };

    const variant = publishJob.contentVariant;
    const privacy = (variant.privacy as YouTubePrivacy) || YouTubePrivacy.PRIVATE;

    // 4. Perform upload to YouTube
    const uploadResult = await youtubeService.uploadVideo(tokens, {
      filePath: publishJob.video.localPath,
      title: variant.title || publishJob.video.filename,
      description: variant.description || '',
      tags: (variant.tags as string[]) || [],
      categoryId: variant.category || '22',
      privacyStatus: privacy,
    });

    // 5. Successful publish transaction
    await prisma.$transaction(async (tx) => {
      // Create PublishedPost record
      await tx.publishedPost.create({
        data: {
          publishJobId,
          videoId,
          socialAccountId,
          platform: SocialPlatform.YOUTUBE,
          externalPostId: uploadResult.videoId,
          externalUrl: uploadResult.videoUrl,
          publishedAt: new Date(),
          metrics: { views: 0, likes: 0, comments: 0 },
        },
      });

      // Update attempt
      await tx.publishAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCESS',
          responsePayload: uploadResult as any,
          finishedAt: new Date(),
        },
      });

      // Update job
      await tx.publishJob.update({
        where: { id: publishJobId },
        data: {
          status: PublishJobStatus.SUCCESS,
          lastError: null,
        },
      });

      // Update video status
      await tx.video.update({
        where: { id: videoId },
        data: { status: VideoStatus.PUBLISHED },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.VIDEO_PUBLISHED,
          entity: 'PublishedPost',
          entityId: uploadResult.videoId,
          metadata: {
            platform: SocialPlatform.YOUTUBE,
            videoId,
            videoUrl: uploadResult.videoUrl,
          },
        },
      });
    });

    // Notify user
    await notificationsQueue.add('send-notification', {
      userId,
      title: 'YouTube Video Published!',
      message: `Your video "${variant.title || publishJob.video.filename}" is now published on YouTube.`,
      type: 'SUCCESS',
      link: uploadResult.videoUrl,
    });

    return {
      videoUrl: uploadResult.videoUrl,
      externalPostId: uploadResult.videoId,
    };
  } catch (error: any) {
    console.error(`[YouTubePublish] Failed to publish video ${videoId} to YouTube:`, error);
    await markJobFailed(publishJobId, attempt.id, error.message || 'YouTube upload failed', videoId, userId);
    throw error;
  }
}

async function markJobFailed(jobId: string, attemptId: string, error: string, videoId: string, userId: string) {
  await prisma.publishAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'FAILED',
      error,
      finishedAt: new Date(),
    },
  });

  await prisma.publishJob.update({
    where: { id: jobId },
    data: {
      status: PublishJobStatus.FAILED,
      lastError: error,
    },
  });

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.FAILED },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.PUBLISH_FAILED,
      entity: 'PublishJob',
      entityId: jobId,
      metadata: { error, videoId, platform: SocialPlatform.YOUTUBE },
    },
  });

  await notificationsQueue.add('send-notification', {
    userId,
    title: 'YouTube Publishing Failed',
    message: `Publishing failed: ${error}`,
    type: 'ERROR',
    link: '/publishing',
  });
}
