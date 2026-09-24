import { FastifyInstance } from 'fastify';
import { prisma, VideoStatus, SocialPlatform, PublishJobStatus } from '@muza/database';
import { googleDriveService, youtubeService, instagramService } from '@muza/integrations';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Overview Dashboard Metrics
  fastify.get('/overview', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;

    const [
      totalVideos,
      pendingReview,
      scheduled,
      published,
      failed,
      driveConnection,
      youtubeAccount,
      instagramAccount,
      publishedPosts,
    ] = await Promise.all([
      prisma.video.count({ where: { userId } }),
      prisma.video.count({
        where: {
          userId,
          status: {
            in: [
              VideoStatus.READY_FOR_REVIEW,
              VideoStatus.PROCESSING,
              VideoStatus.ANALYZING,
              VideoStatus.GENERATING_CONTENT,
            ],
          },
        },
      }),
      prisma.video.count({ where: { userId, status: VideoStatus.SCHEDULED } }),
      prisma.video.count({ where: { userId, status: VideoStatus.PUBLISHED } }),
      prisma.video.count({ where: { userId, status: VideoStatus.FAILED } }),
      prisma.driveConnection.findFirst({ where: { userId } }),
      prisma.socialAccount.findFirst({ where: { userId, platform: SocialPlatform.YOUTUBE } }),
      prisma.socialAccount.findFirst({ where: { userId, platform: SocialPlatform.INSTAGRAM } }),
      prisma.publishedPost.findMany({
        where: { video: { userId } },
        select: { metrics: true, platform: true },
      }),
    ]);

    // Aggregate real post metrics
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalReach = 0;

    for (const post of publishedPosts) {
      const m: any = post.metrics || {};
      totalViews += Number(m.views || m.plays || 0);
      totalLikes += Number(m.likes || 0);
      totalComments += Number(m.comments || 0);
      totalReach += Number(m.reach || m.views || 0);
    }

    return sendSuccess(reply, {
      cards: {
        totalVideos,
        pendingReview,
        scheduled,
        published,
        failed,
      },
      engagement: {
        totalViews,
        totalLikes,
        totalComments,
        totalReach,
      },
      integrations: {
        googleDrive: {
          configured: googleDriveService.isConfigured(),
          connected: Boolean(driveConnection && driveConnection.status === 'CONNECTED'),
          email: driveConnection?.accountEmail,
        },
        youtube: {
          configured: youtubeService.isConfigured(),
          connected: Boolean(youtubeAccount && youtubeAccount.status === 'CONNECTED'),
          channelName: youtubeAccount?.accountName,
        },
        instagram: {
          configured: instagramService.isConfigured(),
          connected: Boolean(instagramAccount && instagramAccount.status === 'CONNECTED'),
          accountName: instagramAccount?.accountName,
        },
      },
    });
  });
}
