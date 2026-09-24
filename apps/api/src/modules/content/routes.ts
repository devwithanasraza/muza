import { FastifyInstance } from 'fastify';
import { prisma, VideoStatus } from '@muza/database';
import { UpdateVariantSchema, AuditAction } from '@muza/shared';
import { contentGenQueue } from '@muza/queues';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function contentRoutes(fastify: FastifyInstance) {
  // Review queue
  fastify.get('/review-queue', { preHandler: [authenticate] }, async (request, reply) => {
    const videos = await prisma.video.findMany({
      where: {
        userId: request.user!.id,
        status: {
          in: [VideoStatus.READY_FOR_REVIEW, VideoStatus.PROCESSING, VideoStatus.ANALYZING, VideoStatus.GENERATING_CONTENT],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        analysis: true,
        variants: true,
      },
    });

    return sendSuccess(
      reply,
      videos.map((v) => ({ ...v, fileSize: Number(v.fileSize) }))
    );
  });

  // Get Variant
  fastify.get('/variants/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const variant = await prisma.contentVariant.findFirst({
      where: {
        id,
        video: { userId: request.user!.id },
      },
      include: { video: true },
    });

    if (!variant) {
      return sendError(reply, 404, 'NOT_FOUND', 'Content variant not found');
    }

    return sendSuccess(reply, variant);
  });

  // Update Variant
  fastify.put('/variants/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UpdateVariantSchema.safeParse(request.body);

    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid variant update payload', parseResult.error.format());
    }

    const variant = await prisma.contentVariant.findFirst({
      where: {
        id,
        video: { userId: request.user!.id },
      },
    });

    if (!variant) {
      return sendError(reply, 404, 'NOT_FOUND', 'Content variant not found');
    }

    const updated = await prisma.contentVariant.update({
      where: { id },
      data: {
        ...parseResult.data,
        status: 'REVIEWED',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user!.id,
        action: AuditAction.CONTENT_EDITED,
        entity: 'ContentVariant',
        entityId: id,
        metadata: { changes: parseResult.data },
      },
    });

    return sendSuccess(reply, updated);
  });

  // Approve Variant
  fastify.post('/variants/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const variant = await prisma.contentVariant.findFirst({
      where: {
        id,
        video: { userId: request.user!.id },
      },
      include: { video: true },
    });

    if (!variant) {
      return sendError(reply, 404, 'NOT_FOUND', 'Content variant not found');
    }

    // Brand safety check: Ensure title or caption is not empty and fields meet constraints
    if (variant.platform === 'YOUTUBE' && (!variant.title || variant.title.trim().length === 0)) {
      return sendError(reply, 400, 'BRAND_SAFETY_VIOLATION', 'Content requires attention: YouTube title cannot be empty.');
    }
    if (variant.platform === 'INSTAGRAM' && (!variant.caption || variant.caption.trim().length === 0)) {
      return sendError(reply, 400, 'BRAND_SAFETY_VIOLATION', 'Content requires attention: Instagram caption cannot be empty.');
    }

    // Use transaction for state consistency
    const result = await prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.contentVariant.update({
        where: { id },
        data: {
          isApproved: true,
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: request.user!.id,
        },
      });

      await tx.video.update({
        where: { id: variant.videoId },
        data: { status: VideoStatus.APPROVED },
      });

      await tx.auditLog.create({
        data: {
          userId: request.user!.id,
          action: AuditAction.CONTENT_APPROVED,
          entity: 'ContentVariant',
          entityId: id,
          metadata: { platform: variant.platform, videoId: variant.videoId },
        },
      });

      return updatedVariant;
    });

    return sendSuccess(reply, result);
  });

  // Reject Variant
  fastify.post('/variants/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const variant = await prisma.contentVariant.findFirst({
      where: {
        id,
        video: { userId: request.user!.id },
      },
    });

    if (!variant) {
      return sendError(reply, 404, 'NOT_FOUND', 'Content variant not found');
    }

    const updated = await prisma.contentVariant.update({
      where: { id },
      data: {
        isApproved: false,
        status: 'REJECTED',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user!.id,
        action: AuditAction.CONTENT_REJECTED,
        entity: 'ContentVariant',
        entityId: id,
      },
    });

    return sendSuccess(reply, updated);
  });

  // Regenerate AI Content
  fastify.post('/videos/:id/regenerate', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { customInstructions } = (request.body as { customInstructions?: string }) || {};

    const video = await prisma.video.findFirst({
      where: { id, userId: request.user!.id },
      include: { analysis: true },
    });

    if (!video) {
      return sendError(reply, 404, 'NOT_FOUND', 'Video not found');
    }

    if (!video.analysis) {
      return sendError(reply, 400, 'NO_ANALYSIS', 'Video must be analyzed first before regenerating content.');
    }

    await prisma.video.update({
      where: { id },
      data: { status: VideoStatus.GENERATING_CONTENT },
    });

    const job = await contentGenQueue.add(
      'regenerate-content',
      {
        videoId: video.id,
        userId: request.user!.id,
        customInstructions,
      },
      { jobId: `regen-${video.id}-${Date.now()}` }
    );

    return sendSuccess(reply, {
      message: 'AI content regeneration started',
      jobId: job.id,
    });
  });
}
