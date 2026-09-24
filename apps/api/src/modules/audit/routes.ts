import { FastifyInstance } from 'fastify';
import { prisma } from '@muza/database';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/logs', { preHandler: [authenticate] }, async (request, reply) => {
    const { action, entity, page = '1', limit = '30' } = request.query as {
      action?: string;
      entity?: string;
      page?: string;
      limit?: string;
    };

    const take = Math.min(Number(limit) || 30, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {
      userId: request.user!.id,
    };

    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return sendSuccess(reply, logs, 200, {
      total,
      page: Number(page) || 1,
      limit: take,
      totalPages: Math.ceil(total / take),
    });
  });
}
