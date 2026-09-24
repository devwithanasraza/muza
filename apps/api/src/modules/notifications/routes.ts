import { FastifyInstance } from 'fastify';
import { prisma } from '@muza/database';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // List notifications
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: request.user!.id, isRead: false },
    });

    return sendSuccess(reply, {
      unreadCount,
      notifications,
    });
  });

  // Mark single as read
  fastify.put('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.notification.updateMany({
      where: { id, userId: request.user!.id },
      data: { isRead: true },
    });

    return sendSuccess(reply, { success: true });
  });

  // Mark all as read
  fastify.put('/read-all', { preHandler: [authenticate] }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { userId: request.user!.id, isRead: false },
      data: { isRead: true },
    });

    return sendSuccess(reply, { success: true });
  });
}
