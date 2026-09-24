import { FastifyInstance } from 'fastify';
import { prisma, SocialPlatform } from '@muza/database';
import { AuditAction } from '@muza/shared';
import { youtubeService, encrypt } from '@muza/integrations';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function youtubeRoutes(fastify: FastifyInstance) {
  // Auth URL
  fastify.get('/auth-url', { preHandler: [authenticate] }, async (request, reply) => {
    if (!youtubeService.isConfigured()) {
      return sendError(
        reply,
        400,
        'INTEGRATION_NOT_CONFIGURED',
        'YouTube integration not configured. Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET.'
      );
    }

    const state = JSON.stringify({ userId: request.user!.id, timestamp: Date.now() });
    const url = youtubeService.getAuthorizationUrl(Buffer.from(state).toString('base64'));

    return sendSuccess(reply, { url });
  });

  // Callback
  fastify.get('/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/youtube?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/youtube?error=missing_code_or_state`);
    }

    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      userId = decodedState.userId;
    } catch {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/youtube?error=invalid_state`);
    }

    try {
      const { tokens, channelId, channelTitle } = await youtubeService.exchangeCode(code);

      const accessTokenEncrypted = encrypt(tokens.accessToken);
      const refreshTokenEncrypted = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;
      const tokenExpiresAt = tokens.expiryDate ? new Date(tokens.expiryDate) : null;

      const socialAccount = await prisma.socialAccount.upsert({
        where: {
          userId_platform_externalAccountId: {
            userId,
            platform: SocialPlatform.YOUTUBE,
            externalAccountId: channelId || 'default-channel',
          },
        },
        create: {
          userId,
          platform: SocialPlatform.YOUTUBE,
          accountName: channelTitle || 'YouTube Channel',
          externalAccountId: channelId || 'default-channel',
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          status: 'CONNECTED',
        },
        update: {
          accountName: channelTitle || 'YouTube Channel',
          accessTokenEncrypted,
          ...(refreshTokenEncrypted ? { refreshTokenEncrypted } : {}),
          tokenExpiresAt,
          status: 'CONNECTED',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.SOCIAL_ACCOUNT_CONNECTED,
          entity: 'SocialAccount',
          entityId: socialAccount.id,
          metadata: { platform: 'YOUTUBE', channelTitle, channelId },
        },
      });

      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/youtube?connected=true`);
    } catch (err: any) {
      console.error('[YouTube Callback Error]', err);
      return reply.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/youtube?error=${encodeURIComponent(err.message)}`
      );
    }
  });

  // Get accounts
  fastify.get('/accounts', { preHandler: [authenticate] }, async (request, reply) => {
    const isConfigured = youtubeService.isConfigured();
    const accounts = await prisma.socialAccount.findMany({
      where: {
        userId: request.user!.id,
        platform: SocialPlatform.YOUTUBE,
      },
      select: {
        id: true,
        accountName: true,
        externalAccountId: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });

    return sendSuccess(reply, {
      isConfigured,
      connected: accounts.length > 0,
      accounts,
    });
  });

  // Disconnect
  fastify.delete('/accounts/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const account = await prisma.socialAccount.findFirst({
      where: { id, userId: request.user!.id, platform: SocialPlatform.YOUTUBE },
    });

    if (!account) {
      return sendError(reply, 404, 'NOT_FOUND', 'YouTube account not found');
    }

    await prisma.socialAccount.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: request.user!.id,
        action: AuditAction.SOCIAL_ACCOUNT_DISCONNECTED,
        entity: 'SocialAccount',
        entityId: id,
        metadata: { platform: 'YOUTUBE' },
      },
    });

    return sendSuccess(reply, { message: 'YouTube account disconnected successfully' });
  });
}
