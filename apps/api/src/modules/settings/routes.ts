import { FastifyInstance } from 'fastify';
import { prisma } from '@muza/database';
import { SystemSettingsSchema, AuditAction } from '@muza/shared';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { Role } from '@muza/database';

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get system settings
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const rawSettings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};

    for (const s of rawSettings) {
      settingsMap[s.key] = s.value;
    }

    return sendSuccess(reply, settingsMap);
  });

  // Update settings (Admin/Owner only)
  fastify.put(
    '/',
    { preHandler: [authenticate, requireRole([Role.OWNER, Role.ADMIN])] },
    async (request, reply) => {
      const parseResult = SystemSettingsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid settings parameters', parseResult.error.format());
      }

      const data = parseResult.data;

      const entries = [
        { key: 'ai_provider', value: data.aiProvider },
        { key: 'ai_model', value: data.aiModel },
        { key: 'default_language', value: data.defaultLanguage },
        { key: 'default_timezone', value: data.defaultTimezone },
        { key: 'default_youtube_privacy', value: data.defaultYouTubePrivacy },
        { key: 'auto_processing', value: String(data.autoProcessing) },
        { key: 'auto_generate_content', value: String(data.autoGenerateContent) },
        { key: 'require_approval', value: String(data.requireApproval) },
        { key: 'auto_publish', value: String(data.autoPublish) },
        { key: 'max_retry_limits', value: String(data.maxRetryLimits) },
      ];

      for (const entry of entries) {
        await prisma.systemSetting.upsert({
          where: { key: entry.key },
          create: { key: entry.key, value: entry.value },
          update: { value: entry.value },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: request.user!.id,
          action: AuditAction.SETTINGS_UPDATED,
          entity: 'SystemSetting',
          entityId: 'global',
          metadata: data,
        },
      });

      return sendSuccess(reply, { message: 'Settings updated successfully' });
    }
  );
}
