import { Job } from 'bullmq';
import { prisma, SocialPlatform } from '@muza/database';
import { youtubeService, instagramService, decrypt } from '@muza/integrations';

export async function processAnalyticsSync(job: Job): Promise<{ updatedPostsCount: number }> {
  console.log('[AnalyticsSync] Running analytics metrics synchronization...');

  const publishedPosts = await prisma.publishedPost.findMany({
    include: {
      socialAccount: true,
    },
    take: 50,
    orderBy: { publishedAt: 'desc' },
  });

  let updatedCount = 0;

  for (const post of publishedPosts) {
    try {
      const accessToken = decrypt(post.socialAccount.accessTokenEncrypted);

      if (post.platform === SocialPlatform.YOUTUBE && youtubeService.isConfigured()) {
        const metrics = await youtubeService.getVideoMetrics(
          { accessToken },
          post.externalPostId
        );

        await prisma.publishedPost.update({
          where: { id: post.id },
          data: { metrics },
        });
        updatedCount++;
      } else if (post.platform === SocialPlatform.INSTAGRAM && instagramService.isConfigured()) {
        const metrics = await instagramService.getMediaMetrics(accessToken, post.externalPostId);
        await prisma.publishedPost.update({
          where: { id: post.id },
          data: { metrics },
        });
        updatedCount++;
      }
    } catch (err: any) {
      console.warn(`[AnalyticsSync] Failed to fetch metrics for post ${post.id}: ${err.message}`);
    }
  }

  return { updatedPostsCount: updatedCount };
}
