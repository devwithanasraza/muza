import { Job } from 'bullmq';
import { prisma, VideoStatus, SocialPlatform, PublishJobStatus } from '@muza/database';
import { AuditAction } from '@muza/shared';
import { instagramService, decrypt } from '@muza/integrations';
import { notificationsQueue } from '@muza/queues';

export interface InstagramPublishJobData {
  publishJobId: string;
  videoId: string;
  contentVariantId: string;
  socialAccountId: string;
  userId: string;
}

export async function processInstagramPublish(job: Job<InstagramPublishJobData>): Promise<{ mediaId: string; permalink?: string }> {
  const { publishJobId, videoId, contentVariantId, socialAccountId, userId } = job.data;
  console.log(`[InstagramPublish] Processing Reel publish for job ${publishJobId}, video ${videoId}`);

  // 1. Idempotency safeguard
  const existingPublished = await prisma.publishedPost.findFirst({
    where: {
      videoId,
      socialAccountId,
      platform: SocialPlatform.INSTAGRAM,
    },
  });

  if (existingPublished) {
    console.warn(`[InstagramPublish] Idempotency safeguard triggered: Video ${videoId} already published on Instagram (Media ID: ${existingPublished.externalPostId}).`);
    await prisma.publishJob.update({
      where: { id: publishJobId },
      data: { status: PublishJobStatus.SUCCESS },
    });
    return {
      mediaId: existingPublished.externalPostId,
      permalink: existingPublished.externalUrl || undefined,
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

  // 3. Check integration credentials
  if (!instagramService.isConfigured()) {
    const errorMsg = 'Integration not configured: Meta API credentials (META_APP_ID / META_APP_SECRET) are missing.';
    await markJobFailed(publishJobId, attempt.id, errorMsg, videoId, userId);
    throw new Error(errorMsg);
  }

  try {
    const accessToken = decrypt(publishJob.socialAccount.accessTokenEncrypted);
    const igUserId = publishJob.socialAccount.externalAccountId;
    const variant = publishJob.contentVariant;

    // Build Instagram Caption with hashtags
    const hashtags = (variant.hashtags as string[]) || [];
    const fullCaption = `${variant.caption || ''}\n\n${hashtags.join(' ')}`.trim();

    // Instagram Reels requires a publicly accessible video URL.
    // We use the Google Drive webView/download link or CDN link:
    const videoUrl =
      publishJob.video.driveWebViewLink ||
      `https://drive.google.com/uc?export=download&id=${publishJob.video.driveFileId}`;

    // Publish Reel
    const result = await instagramService.publishReel(accessToken, igUserId, videoUrl, fullCaption);

    // 4. Save results in MySQL
    await prisma.$transaction(async (tx) => {
      await tx.publishedPost.create({
        data: {
          publishJobId,
          videoId,
          socialAccountId,
          platform: SocialPlatform.INSTAGRAM,
          externalPostId: result.mediaId,
          externalUrl: result.permalink,
          publishedAt: new Date(),
          metrics: { reach: 0, plays: 0, likes: 0, comments: 0 },
        },
      });

      await tx.publishAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCESS',
          responsePayload: result as any,
          finishedAt: new Date(),
        },
      });

      await tx.publishJob.update({
        where: { id: publishJobId },
        data: {
          status: PublishJobStatus.SUCCESS,
          lastError: null,
        },
      });

      await tx.video.update({
        where: { id: videoId },
        data: { status: VideoStatus.PUBLISHED },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.VIDEO_PUBLISHED,
          entity: 'PublishedPost',
          entityId: result.mediaId,
          metadata: {
            platform: SocialPlatform.INSTAGRAM,
            videoId,
            mediaId: result.mediaId,
            permalink: result.permalink,
          },
        },
      });
    });

    // Notify user
    await notificationsQueue.add('send-notification', {
      userId,
      title: 'Instagram Reel Published!',
      message: `Your video "${publishJob.video.filename}" is now published as an Instagram Reel.`,
      type: 'SUCCESS',
      link: result.permalink,
    });

    return result;
  } catch (error: any) {
    console.error(`[InstagramPublish] Failed to publish video ${videoId} to Instagram:`, error);
    await markJobFailed(publishJobId, attempt.id, error.message || 'Instagram publish failed', videoId, userId);
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
      metadata: { error, videoId, platform: SocialPlatform.INSTAGRAM },
    },
  });

  await notificationsQueue.add('send-notification', {
    userId,
    title: 'Instagram Publishing Failed',
    message: `Publishing failed: ${error}`,
    type: 'ERROR',
    link: '/publishing',
  });
}
