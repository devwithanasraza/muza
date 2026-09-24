import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@muza/database';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function hashtagRoutes(fastify: FastifyInstance) {
  // List hashtags
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { category, search } = request.query as { category?: string; search?: string };

    const where: any = {};
    if (category) where.category = category;
    if (search) where.tag = { contains: search };

    const tags = await prisma.hashtag.findMany({
      where,
      orderBy: { relevanceScore: 'desc' },
      take: 100,
    });

    return sendSuccess(reply, tags);
  });

  // Add hashtag
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const Schema = z.object({
      tag: z.string().min(1).regex(/^#?[a-zA-Z0-9_]+$/, 'Invalid hashtag'),
      category: z.enum(['primary', 'niche', 'audience', 'discovery', 'brand']).default('primary'),
      relevanceScore: z.number().min(0).max(1).default(1.0),
    });

    const parseResult = Schema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid hashtag payload', parseResult.error.format());
    }

    const cleanTag = parseResult.data.tag.replace(/^#/, '');

    const hashtag = await prisma.hashtag.upsert({
      where: { tag: cleanTag },
      create: {
        tag: cleanTag,
        category: parseResult.data.category,
        relevanceScore: parseResult.data.relevanceScore,
        source: 'user',
      },
      update: {
        category: parseResult.data.category,
        relevanceScore: parseResult.data.relevanceScore,
      },
    });

    return sendSuccess(reply, hashtag);
  });

  // Delete hashtag
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.hashtag.delete({ where: { id } });
    return sendSuccess(reply, { message: 'Hashtag removed' });
  });
}
