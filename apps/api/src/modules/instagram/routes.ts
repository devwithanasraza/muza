import { FastifyInstance } from 'fastify';
import { prisma, SocialPlatform } from '@muza/database';
import { AuditAction } from '@muza/shared';
import { instagramService, encrypt } from '@muza/integrations';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function instagramRoutes(fastify: FastifyInstance) {
  // Auth URL
  fastify.get('/auth-url', { preHandler: [authenticate] }, async (request, reply) => {
    if (!instagramService.isConfigured()) {
      return sendError(
        reply,
        400,
        'INTEGRATION_NOT_CONFIGURED',
        'Meta/Instagram integration not configured. Missing META_APP_ID or META_APP_SECRET.'
      );
    }

    const state = JSON.stringify({ userId: request.user!.id, timestamp: Date.now() });
    const url = instagramService.getAuthorizationUrl(Buffer.from(state).toString('base64'));

    return sendSuccess(reply, { url });
  });

  // Callback
  fastify.get('/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/instagram?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/instagram?error=missing_code_or_state`);
    }

    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      userId = decodedState.userId;
    } catch {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/instagram?error=invalid_state`);
    }

    try {
      const { accessToken, accounts } = await instagramService.exchangeCode(code);
      const encryptedToken = encrypt(accessToken);

      for (const ig of accounts) {
        await prisma.socialAccount.upsert({
          where: {
            userId_platform_externalAccountId: {
              userId,
              platform: SocialPlatform.INSTAGRAM,
              externalAccountId: ig.id,
            },
          },
          create: {
            userId,
            platform: SocialPlatform.INSTAGRAM,
            accountName: ig.username,
            externalAccountId: ig.id,
            accessTokenEncrypted: encryptedToken,
            status: 'CONNECTED',
            metadata: {
              name: ig.name,
              profilePictureUrl: ig.profilePictureUrl,
            },
          },
          update: {
            accountName: ig.username,
            accessTokenEncrypted: encryptedToken,
            status: 'CONNECTED',
            metadata: {
              name: ig.name,
              profilePictureUrl: ig.profilePictureUrl,
            },
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.SOCIAL_ACCOUNT_CONNECTED,
          entity: 'SocialAccount',
          entityId: accounts[0]?.id || 'unknown',
          metadata: { platform: 'INSTAGRAM', accountsCount: accounts.length },
        },
      });

      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/instagram?connected=true`);
    } catch (err: any) {
      console.error('[Instagram Callback Error]', err);
      return reply.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/instagram?error=${encodeURIComponent(err.message)}`
      );
    }
  });

  // Get accounts
  fastify.get('/accounts', { preHandler: [authenticate] }, async (request, reply) => {
    const isConfigured = instagramService.isConfigured();
    const accounts = await prisma.socialAccount.findMany({
      where: {
        userId: request.user!.id,
        platform: SocialPlatform.INSTAGRAM,
      },
      select: {
        id: true,
        accountName: true,
        externalAccountId: true,
        status: true,
        metadata: true,
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
      where: { id, userId: request.user!.id, platform: SocialPlatform.INSTAGRAM },
    });

    if (!account) {
      return sendError(reply, 404, 'NOT_FOUND', 'Instagram account not found');
    }

    await prisma.socialAccount.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: request.user!.id,
        action: AuditAction.SOCIAL_ACCOUNT_DISCONNECTED,
        entity: 'SocialAccount',
        entityId: id,
        metadata: { platform: 'INSTAGRAM' },
      },
    });

    return sendSuccess(reply, { message: 'Instagram account disconnected successfully' });
  });
}
