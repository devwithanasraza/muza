import { Job } from 'bullmq';
import { prisma, VideoStatus, SocialPlatform, YouTubePrivacy } from '@muza/database';
import { aiService } from '@muza/ai';
import { ContentJson, AuditAction } from '@muza/shared';
import { notificationsQueue } from '@muza/queues';

export interface ContentGenJobData {
  videoId: string;
  userId: string;
  customInstructions?: string;
}

export async function processContentGen(job: Job<ContentGenJobData>): Promise<{ variantsCreated: number }> {
  const { videoId, userId, customInstructions } = job.data;
  console.log(`[ContentGen] Generating content for video ${videoId} (job: ${job.id})`);

  // Transition video status to GENERATING_CONTENT
  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.GENERATING_CONTENT },
  });

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { analysis: true },
  });

  if (!video || !video.analysis) {
    throw new Error(`Video or analysis missing for video: ${videoId}`);
  }

  // Load Brand Profile for user
  const brandProfile = await prisma.brandProfile.findFirst({
    where: { userId, isDefault: true },
  });

  let generatedContent: ContentJson;

  if (aiService.isConfigured()) {
    try {
      generatedContent = await aiService.generateSocialContent({
        transcript: video.analysis.transcript,
        analysis: {
          transcript: video.analysis.transcript,
          detectedLanguage: video.analysis.detectedLanguage,
          topics: (video.analysis.topics as string[]) || [],
          keywords: (video.analysis.keywords as string[]) || [],
          entities: (video.analysis.entities as string[]) || [],
          summary: video.analysis.summary || '',
          hook: video.analysis.hook || '',
          targetAudience: video.analysis.targetAudience || '',
          contentCategory: video.analysis.contentCategory || '',
          visualSummary: video.analysis.visualSummary || '',
          duration: video.analysis.duration || 60,
          confidence: video.analysis.confidence || 0.9,
        },
        brandProfile: brandProfile
          ? {
              brandName: brandProfile.brandName,
              niche: brandProfile.niche,
              audience: brandProfile.audience,
              language: brandProfile.language,
              tone: brandProfile.tone,
              descriptionStyle: brandProfile.descriptionStyle,
              captionStyle: brandProfile.captionStyle,
              defaultCTA: brandProfile.defaultCTA,
              defaultHashtags: (brandProfile.defaultHashtags as string[]) || [],
              forbiddenWords: (brandProfile.forbiddenWords as string[]) || [],
              preferredWords: (brandProfile.preferredWords as string[]) || [],
              emojiPolicy: brandProfile.emojiPolicy,
            }
          : null,
        customInstructions,
      });
    } catch (aiErr: any) {
      console.warn(`[ContentGen] AI content generation failed: ${aiErr.message}. Generating rule-based copy.`);
      generatedContent = getFallbackContent(video.filename, video.analysis.summary, brandProfile?.brandName);
    }
  } else {
    console.log(`[ContentGen] AI Provider not configured. Creating structured template copy.`);
    generatedContent = getFallbackContent(video.filename, video.analysis.summary, brandProfile?.brandName);
  }

  // Save or update YouTube ContentVariant
  await prisma.contentVariant.upsert({
    where: {
      id: (
        await prisma.contentVariant.findFirst({
          where: { videoId, platform: SocialPlatform.YOUTUBE },
          select: { id: true },
        })
      )?.id || 'non-existent-uuid',
    },
    create: {
      videoId,
      platform: SocialPlatform.YOUTUBE,
      title: generatedContent.youtube.title.slice(0, 100),
      description: generatedContent.youtube.description.slice(0, 5000),
      tags: generatedContent.youtube.tags,
      keywords: generatedContent.youtube.keywords,
      category: generatedContent.youtube.category,
      cta: generatedContent.youtube.cta,
      privacy: YouTubePrivacy.PRIVATE,
      status: 'DRAFT',
      isApproved: false,
    },
    update: {
      title: generatedContent.youtube.title.slice(0, 100),
      description: generatedContent.youtube.description.slice(0, 5000),
      tags: generatedContent.youtube.tags,
      keywords: generatedContent.youtube.keywords,
      category: generatedContent.youtube.category,
      cta: generatedContent.youtube.cta,
      status: 'DRAFT',
      isApproved: false,
    },
  });

  // Save or update Instagram ContentVariant
  await prisma.contentVariant.upsert({
    where: {
      id: (
        await prisma.contentVariant.findFirst({
          where: { videoId, platform: SocialPlatform.INSTAGRAM },
          select: { id: true },
        })
      )?.id || 'non-existent-uuid',
    },
    create: {
      videoId,
      platform: SocialPlatform.INSTAGRAM,
      caption: generatedContent.instagram.caption.slice(0, 2200),
      hashtags: generatedContent.instagram.hashtags,
      cta: generatedContent.instagram.cta,
      hook: generatedContent.instagram.hook,
      status: 'DRAFT',
      isApproved: false,
    },
    update: {
      caption: generatedContent.instagram.caption.slice(0, 2200),
      hashtags: generatedContent.instagram.hashtags,
      cta: generatedContent.instagram.cta,
      hook: generatedContent.instagram.hook,
      status: 'DRAFT',
      isApproved: false,
    },
  });

  // Transition video status to READY_FOR_REVIEW
  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.READY_FOR_REVIEW },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.AI_CONTENT_GENERATED,
      entity: 'Video',
      entityId: videoId,
      metadata: {
        youtubeTitle: generatedContent.youtube.title,
        instagramHashtags: generatedContent.instagram.hashtags,
      },
    },
  });

  // Notify user
  await notificationsQueue.add('send-notification', {
    userId,
    title: 'Content Ready for Review',
    message: `AI has generated YouTube and Instagram content for "${video.filename}". Review and approve to publish.`,
    type: 'SUCCESS',
    link: `/review/${videoId}`,
  });

  return { variantsCreated: 2 };
}

function getFallbackContent(filename: string, summary?: string | null, brandName = 'MUZA'): ContentJson {
  const cleanTitle = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  return {
    youtube: {
      title: `${cleanTitle} | Complete Guide & Overview`.slice(0, 100),
      description: `${summary || 'In this video, we dive deep into production-grade systems and automation.'}\n\n📌 Timestamps:\n0:00 - Introduction\n01:30 - Core Architecture\n03:45 - Key Demo\n06:00 - Final Takeaways\n\n💡 Don't forget to like, share, and subscribe to ${brandName}!`,
      tags: ['technology', 'engineering', 'automation', 'productivity', 'software', 'guide'],
      keywords: ['tech', 'architecture', 'scalability'],
      category: '22',
      cta: `Subscribe to ${brandName} for more in-depth technology breakdowns!`,
    },
    instagram: {
      caption: `🚀 ${cleanTitle}\n\nHere is how you can streamline and elevate your workflow with automated intelligence.\n\n👇 Drop your thoughts in the comments!\n\nFollow @${brandName.toLowerCase().replace(/\s+/g, '')} for daily tech insights.`,
      hashtags: ['#TechTrends', '#ProductivityHacks', '#Automation', '#SoftwareEngineering', '#DevLife'],
      cta: `Save this Reel and follow @${brandName.toLowerCase().replace(/\s+/g, '')} for more!`,
      hook: `Stop doing this manually! Here is the future:`,
    },
  };
}
