import { FastifyInstance } from 'fastify';
import { prisma } from '@muza/database';
import { UpdateBrandProfileSchema } from '@muza/shared';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function brandRoutes(fastify: FastifyInstance) {
  // Get Brand Profile
  fastify.get('/profile', { preHandler: [authenticate] }, async (request, reply) => {
    let profile = await prisma.brandProfile.findFirst({
      where: { userId: request.user!.id, isDefault: true },
    });

    if (!profile) {
      profile = await prisma.brandProfile.create({
        data: {
          userId: request.user!.id,
          brandName: 'Default Brand',
          niche: 'Technology',
          language: 'English',
          tone: 'Professional & Engaging',
          isDefault: true,
        },
      });
    }

    return sendSuccess(reply, profile);
  });

  // Update Brand Profile
  fastify.put('/profile', { preHandler: [authenticate] }, async (request, reply) => {
    const parseResult = UpdateBrandProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid brand profile payload', parseResult.error.format());
    }

    const data = parseResult.data;

    let profile = await prisma.brandProfile.findFirst({
      where: { userId: request.user!.id, isDefault: true },
    });

    if (profile) {
      profile = await prisma.brandProfile.update({
        where: { id: profile.id },
        data: {
          brandName: data.brandName,
          niche: data.niche,
          audience: data.audience,
          language: data.language,
          tone: data.tone,
          descriptionStyle: data.descriptionStyle,
          captionStyle: data.captionStyle,
          defaultCTA: data.defaultCTA,
          defaultHashtags: data.defaultHashtags,
          forbiddenWords: data.forbiddenWords,
          preferredWords: data.preferredWords,
          emojiPolicy: data.emojiPolicy,
        },
      });
    } else {
      profile = await prisma.brandProfile.create({
        data: {
          userId: request.user!.id,
          ...data,
          isDefault: true,
        },
      });
    }

    return sendSuccess(reply, profile);
  });
}
