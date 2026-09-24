import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@muza/database';
import { AuditAction } from '@muza/shared';
import { googleDriveService, encrypt, decrypt } from '@muza/integrations';
import { driveSyncQueue } from '@muza/queues';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate } from '../../middleware/auth.js';

export async function driveRoutes(fastify: FastifyInstance) {
  // Get Auth URL
  fastify.get('/auth-url', { preHandler: [authenticate] }, async (request, reply) => {
    if (!googleDriveService.isConfigured()) {
      return sendError(
        reply,
        400,
        'INTEGRATION_NOT_CONFIGURED',
        'Google Drive integration not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.'
      );
    }

    const state = JSON.stringify({ userId: request.user!.id, timestamp: Date.now() });
    const url = googleDriveService.getAuthorizationUrl(Buffer.from(state).toString('base64'));

    return sendSuccess(reply, { url });
  });

  // OAuth Callback
  fastify.get('/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/drive?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/drive?error=missing_code_or_state`);
    }

    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      userId = decodedState.userId;
    } catch {
      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/drive?error=invalid_state`);
    }

    try {
      const { tokens, email, name } = await googleDriveService.exchangeCode(code);

      const accessTokenEncrypted = encrypt(tokens.accessToken);
      const refreshTokenEncrypted = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;
      const tokenExpiresAt = tokens.expiryDate ? new Date(tokens.expiryDate) : null;

      // Upsert DriveConnection in MySQL
      const existing = await prisma.driveConnection.findFirst({ where: { userId } });

      let connectionId: string;
      if (existing) {
        await prisma.driveConnection.update({
          where: { id: existing.id },
          data: {
            accountEmail: email,
            accountName: name,
            accessTokenEncrypted,
            ...(refreshTokenEncrypted ? { refreshTokenEncrypted } : {}),
            tokenExpiresAt,
            status: 'CONNECTED',
            lastError: null,
          },
        });
        connectionId = existing.id;
      } else {
        const created = await prisma.driveConnection.create({
          data: {
            userId,
            accountEmail: email,
            accountName: name,
            accessTokenEncrypted,
            refreshTokenEncrypted,
            tokenExpiresAt,
            status: 'CONNECTED',
          },
        });
        connectionId = created.id;
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.DRIVE_CONNECTED,
          entity: 'DriveConnection',
          entityId: connectionId,
          metadata: { accountEmail: email },
        },
      });

      return reply.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/drive?connected=true`);
    } catch (err: any) {
      console.error('[Drive Callback Error]', err);
      return reply.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/drive?error=${encodeURIComponent(err.message)}`
      );
    }
  });

  // Get Connection Status
  fastify.get('/connections', { preHandler: [authenticate] }, async (request, reply) => {
    const connection = await prisma.driveConnection.findFirst({
      where: { userId: request.user!.id },
      include: { folders: true },
    });

    const isConfigured = googleDriveService.isConfigured();

    if (!connection) {
      return sendSuccess(reply, {
        isConfigured,
        connected: false,
        accountEmail: null,
        folders: [],
      });
    }

    return sendSuccess(reply, {
      isConfigured,
      connected: connection.status === 'CONNECTED',
      accountEmail: connection.accountEmail,
      accountName: connection.accountName,
      status: connection.status,
      folders: connection.folders,
    });
  });

  // List Folders from Google Drive
  fastify.get('/folders', { preHandler: [authenticate] }, async (request, reply) => {
    const connection = await prisma.driveConnection.findFirst({
      where: { userId: request.user!.id },
    });

    if (!connection) {
      return sendError(reply, 400, 'NOT_CONNECTED', 'Google Drive is not connected yet.');
    }

    const accessToken = decrypt(connection.accessTokenEncrypted);
    const refreshToken = connection.refreshTokenEncrypted ? decrypt(connection.refreshTokenEncrypted) : null;

    try {
      const folders = await googleDriveService.listFolders({
        accessToken,
        refreshToken,
        expiryDate: connection.tokenExpiresAt ? connection.tokenExpiresAt.getTime() : undefined,
      });

      return sendSuccess(reply, folders);
    } catch (err: any) {
      return sendError(reply, 500, 'DRIVE_ERROR', `Failed to retrieve folders from Google Drive: ${err.message}`);
    }
  });

  // Select folder for video sync
  fastify.post('/folders/select', { preHandler: [authenticate] }, async (request, reply) => {
    const Schema = z.object({
      folderId: z.string().min(1),
      folderName: z.string().min(1),
      folderPath: z.string().optional(),
    });

    const parseResult = Schema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid folder selection payload', parseResult.error.format());
    }

    const { folderId, folderName, folderPath } = parseResult.data;

    const connection = await prisma.driveConnection.findFirst({
      where: { userId: request.user!.id },
    });

    if (!connection) {
      return sendError(reply, 400, 'NOT_CONNECTED', 'Google Drive is not connected.');
    }

    const folder = await prisma.driveFolder.upsert({
      where: {
        driveConnectionId_folderId: {
          driveConnectionId: connection.id,
          folderId,
        },
      },
      create: {
        driveConnectionId: connection.id,
        folderId,
        folderName,
        folderPath: folderPath || folderName,
        syncEnabled: true,
      },
      update: {
        folderName,
        folderPath: folderPath || folderName,
        syncEnabled: true,
      },
    });

    // Enqueue initial sync
    await driveSyncQueue.add(
      'drive-sync-initial',
      {
        driveConnectionId: connection.id,
        folderId: folder.folderId,
        userId: request.user!.id,
      },
      { jobId: `sync-${connection.id}-${folder.folderId}-${Date.now()}` }
    );

    return sendSuccess(reply, folder);
  });

  // Trigger manual sync
  fastify.post('/sync', { preHandler: [authenticate] }, async (request, reply) => {
    const connection = await prisma.driveConnection.findFirst({
      where: { userId: request.user!.id },
      include: { folders: { where: { syncEnabled: true } } },
    });

    if (!connection || connection.folders.length === 0) {
      return sendError(reply, 400, 'NO_FOLDERS', 'No active Drive folders selected for sync.');
    }

    const jobs = [];
    for (const folder of connection.folders) {
      const job = await driveSyncQueue.add(
        'manual-drive-sync',
        {
          driveConnectionId: connection.id,
          folderId: folder.folderId,
          userId: request.user!.id,
        },
        { jobId: `manual-sync-${folder.id}-${Date.now()}` }
      );
      jobs.push(job.id);
    }

    return sendSuccess(reply, {
      message: `Triggered sync for ${connection.folders.length} folder(s).`,
      jobIds: jobs,
    });
  });
}
