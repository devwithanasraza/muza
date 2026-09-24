import { FastifyInstance } from 'fastify';
import { prisma } from '@muza/database';
import { googleDriveService, youtubeService, instagramService } from '@muza/integrations';
import { aiService } from '@muza/ai';
import { sendSuccess } from '../../utils/response.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'DISCONNECTED';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch (err: any) {
      dbStatus = `ERROR: ${err.message}`;
    }

    return sendSuccess(reply, {
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        provider: 'MySQL',
        status: dbStatus,
      },
      integrations: {
        openai: {
          configured: aiService.isConfigured(),
          status: aiService.isConfigured() ? 'CONFIGURED' : 'CREDENTIALS_MISSING',
        },
        googleDrive: {
          configured: googleDriveService.isConfigured(),
          status: googleDriveService.isConfigured() ? 'CONFIGURED' : 'CREDENTIALS_MISSING',
        },
        youtube: {
          configured: youtubeService.isConfigured(),
          status: youtubeService.isConfigured() ? 'CONFIGURED' : 'CREDENTIALS_MISSING',
        },
        instagram: {
          configured: instagramService.isConfigured(),
          status: instagramService.isConfigured() ? 'CONFIGURED' : 'CREDENTIALS_MISSING',
        },
      },
    });
  });
}
