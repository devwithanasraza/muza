import { FastifyInstance } from 'fastify';
import { prisma, SocialPlatform, PublishJobStatus, VideoStatus } from '@muza/database';
import { SchedulePublishSchema, AuditAction } from '@muza/shared';
import { youtubePublishQueue, instagramPublishQueue } from '@muza/queues';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function publishingRoutes(fastify: FastifyInstance) {
  // Publish Now or Schedule Post
  fastify.post('/schedule', { preHandler: [authenticate] }, async (request, reply) => {
    const parseResult = SchedulePublishSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid publishing payload', parseResult.error.format());
    }

    const { contentVariantId, socialAccountId, platform, scheduledAt, publishNow, timezone } = parseResult.data;
    const userId = request.user!.id;

    // Load Variant
    const variant = await prisma.contentVariant.findFirst({
      where: {
        id: contentVariantId,
        video: { userId },
      },
      include: { video: true },
    });

    if (!variant) {
      return sendError(reply, 404, 'NOT_FOUND', 'Content variant not found');
    }

    // Verify Social Account belongs to user
    const socialAccount = await prisma.socialAccount.findFirst({
      where: { id: socialAccountId, userId, platform },
    });

    if (!socialAccount) {
      return sendError(
        reply,
        400,
        'INVALID_ACCOUNT',
        `Social account for ${platform} not found or not connected.`
      );
    }

    // Idempotency check:
    const idempotencyKey = `${userId}:${variant.videoId}:${platform}:${socialAccountId}`;

    const existingPublished = await prisma.publishedPost.findFirst({
      where: { videoId: variant.videoId, socialAccountId, platform },
    });

    if (existingPublished) {
      return sendError(
        reply,
        409,
        'ALREADY_PUBLISHED',
        `Video has already been published to this ${platform} account. Duplicate publishing is prevented.`
      );
    }

    let targetDate: Date | null = null;
    let delayMs = 0;

    if (!publishNow && scheduledAt) {
      targetDate = new Date(scheduledAt);
      const now = new Date();
      if (targetDate.getTime() <= now.getTime()) {
        return sendError(reply, 400, 'INVALID_SCHEDULE_TIME', 'Scheduled time must be in the future.');
      }
      delayMs = targetDate.getTime() - now.getTime();
    }

    // Transaction to create or update PublishJob
    const publishJob = await prisma.$transaction(async (tx) => {
      const job = await tx.publishJob.upsert({
        where: { idempotencyKey },
        create: {
          videoId: variant.videoId,
          contentVariantId,
          socialAccountId,
          platform,
          scheduledAt: targetDate,
          status: PublishJobStatus.PENDING,
          idempotencyKey,
        },
        update: {
          scheduledAt: targetDate,
          status: PublishJobStatus.PENDING,
          lastError: null,
        },
      });

      await tx.video.update({
        where: { id: variant.videoId },
        data: {
          status: publishNow ? VideoStatus.PUBLISHING : VideoStatus.SCHEDULED,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: publishNow ? AuditAction.VIDEO_PUBLISHING_STARTED : AuditAction.PUBLISH_SCHEDULED,
          entity: 'PublishJob',
          entityId: job.id,
          metadata: {
            platform,
            scheduledAt: targetDate?.toISOString(),
            publishNow,
            timezone,
          },
        },
      });

      return job;
    });

    // Enqueue to respective platform queue
    const queue = platform === SocialPlatform.YOUTUBE ? youtubePublishQueue : instagramPublishQueue;
    const bullJob = await queue.add(
      `publish-${platform.toLowerCase()}`,
      {
        publishJobId: publishJob.id,
        videoId: variant.videoId,
        contentVariantId,
        socialAccountId,
        userId,
      },
      {
        jobId: `publish-${publishJob.id}`,
        delay: delayMs,
      }
    );

    return sendSuccess(reply, {
      publishJob,
      queueJobId: bullJob.id,
      message: publishNow ? 'Publishing started immediately' : `Scheduled for ${targetDate?.toISOString()}`,
    });
  });

  // Publishing history
  fastify.get('/history', { preHandler: [authenticate] }, async (request, reply) => {
    const { platform, status, page = '1', limit = '20' } = request.query as {
      platform?: SocialPlatform;
      status?: PublishJobStatus;
      page?: string;
      limit?: string;
    };

    const take = Math.min(Number(limit) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {
      video: { userId: request.user!.id },
    };

    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.publishJob.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          video: true,
          socialAccount: true,
          contentVariant: true,
          publishedPost: true,
          attempts: { orderBy: { startedAt: 'desc' }, take: 5 },
        },
      }),
      prisma.publishJob.count({ where }),
    ]);

    return sendSuccess(
      reply,
      jobs.map((j) => ({
        ...j,
        video: { ...j.video, fileSize: Number(j.video.fileSize) },
      })),
      200,
      { total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) }
    );
  });

  // Retry failed publish job
  fastify.post('/jobs/:id/retry', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const job = await prisma.publishJob.findFirst({
      where: {
        id,
        video: { userId: request.user!.id },
      },
      include: { video: true },
    });

    if (!job) {
      return sendError(reply, 404, 'NOT_FOUND', 'Publish job not found');
    }

    if (job.status === PublishJobStatus.SUCCESS) {
      return sendError(reply, 400, 'ALREADY_PUBLISHED', 'This job was already completed successfully.');
    }

    await prisma.publishJob.update({
      where: { id },
      data: {
        status: PublishJobStatus.PENDING,
        lastError: null,
      },
    });

    const queue = job.platform === SocialPlatform.YOUTUBE ? youtubePublishQueue : instagramPublishQueue;
    const bullJob = await queue.add(
      `retry-${job.platform.toLowerCase()}`,
      {
        publishJobId: job.id,
        videoId: job.videoId,
        contentVariantId: job.contentVariantId,
        socialAccountId: job.socialAccountId,
        userId: request.user!.id,
      },
      { jobId: `retry-${job.id}-${Date.now()}` }
    );

    return sendSuccess(reply, {
      message: 'Job re-queued for retry',
      queueJobId: bullJob.id,
    });
  });

  // Cancel scheduled/pending job
  fastify.delete('/jobs/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const job = await prisma.publishJob.findFirst({
      where: {
        id,
        video: { userId: request.user!.id },
      },
    });

    if (!job) {
      return sendError(reply, 404, 'NOT_FOUND', 'Publish job not found');
    }

    if (job.status === PublishJobStatus.SUCCESS) {
      return sendError(reply, 400, 'CANNOT_CANCEL', 'Cannot cancel an already published job.');
    }

    await prisma.publishJob.update({
      where: { id },
      data: { status: PublishJobStatus.CANCELLED },
    });

    return sendSuccess(reply, { message: 'Publish job cancelled successfully' });
  });
}
