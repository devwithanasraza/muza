import { FastifyInstance } from 'fastify';
import { prisma, VideoStatus } from '@muza/database';
import { videoProcessingQueue } from '@muza/queues';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function videoRoutes(fastify: FastifyInstance) {
  // List videos
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { status, search, page = '1', limit = '20' } = request.query as {
      status?: VideoStatus;
      search?: string;
      page?: string;
      limit?: string;
    };

    const take = Math.min(Number(limit) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {
      userId: request.user!.id,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.filename = {
        contains: search,
      };
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          analysis: {
            select: {
              id: true,
              summary: true,
              detectedLanguage: true,
              topics: true,
              keywords: true,
              confidence: true,
            },
          },
          variants: {
            select: {
              id: true,
              platform: true,
              title: true,
              caption: true,
              tags: true,
              hashtags: true,
              isApproved: true,
              status: true,
            },
          },
          publishedPosts: {
            select: {
              id: true,
              platform: true,
              externalPostId: true,
              externalUrl: true,
              publishedAt: true,
            },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    // Format BigInt fileSize to number for clean JSON serialization
    const serialized = videos.map((v) => ({
      ...v,
      fileSize: Number(v.fileSize),
    }));

    return sendSuccess(reply, serialized, 200, {
      total,
      page: Number(page) || 1,
      limit: take,
      totalPages: Math.ceil(total / take),
    });
  });

  // Get video details by ID
  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findFirst({
      where: { id, userId: request.user!.id },
      include: {
        analysis: true,
        variants: true,
        processingJobs: { orderBy: { createdAt: 'desc' }, take: 10 },
        publishJobs: {
          orderBy: { createdAt: 'desc' },
          include: { attempts: true },
        },
        publishedPosts: true,
        driveFolder: true,
      },
    });

    if (!video) {
      return sendError(reply, 404, 'NOT_FOUND', 'Video not found');
    }

    return sendSuccess(reply, {
      ...video,
      fileSize: Number(video.fileSize),
    });
  });

  // Trigger reprocess
  fastify.post('/:id/reprocess', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const video = await prisma.video.findFirst({
      where: { id, userId: request.user!.id },
    });

    if (!video) {
      return sendError(reply, 404, 'NOT_FOUND', 'Video not found');
    }

    await prisma.video.update({
      where: { id },
      data: { status: VideoStatus.DISCOVERED },
    });

    const job = await videoProcessingQueue.add(
      'reprocess-video',
      {
        videoId: video.id,
        userId: request.user!.id,
      },
      { jobId: `reprocess-${video.id}-${Date.now()}` }
    );

    return sendSuccess(reply, {
      message: 'Video re-processing queued successfully',
      jobId: job.id,
    });
  });
}
