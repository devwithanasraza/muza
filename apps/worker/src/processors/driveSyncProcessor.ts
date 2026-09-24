import { Job } from 'bullmq';
import { prisma, VideoStatus } from '@muza/database';
import { AuditAction } from '@muza/shared';
import { googleDriveService, decrypt } from '@muza/integrations';
import { videoProcessingQueue, notificationsQueue } from '@muza/queues';

export interface DriveSyncJobData {
  driveConnectionId: string;
  folderId: string;
  userId: string;
}

export async function processDriveSync(job: Job<DriveSyncJobData>): Promise<{ newVideosCount: number }> {
  const { driveConnectionId, folderId, userId } = job.data;
  console.log(`[DriveSync] Processing sync for folder ${folderId} (job: ${job.id})`);

  const connection = await prisma.driveConnection.findUnique({
    where: { id: driveConnectionId },
  });

  if (!connection) {
    throw new Error(`Drive connection not found: ${driveConnectionId}`);
  }

  const driveFolder = await prisma.driveFolder.findFirst({
    where: { driveConnectionId, folderId },
  });

  if (!driveFolder) {
    throw new Error(`Drive folder not found: ${folderId}`);
  }

  // Decrypt OAuth tokens
  const accessToken = decrypt(connection.accessTokenEncrypted);
  const refreshToken = connection.refreshTokenEncrypted ? decrypt(connection.refreshTokenEncrypted) : null;

  const tokens = {
    accessToken,
    refreshToken,
    expiryDate: connection.tokenExpiresAt ? connection.tokenExpiresAt.getTime() : undefined,
  };

  // Scan Google Drive folder
  const driveVideos = await googleDriveService.scanFolderVideos(tokens, folderId);
  console.log(`[DriveSync] Found ${driveVideos.length} video(s) in Drive folder ${folderId}`);

  let newCount = 0;

  for (const driveFile of driveVideos) {
    // Duplicate check 1: driveFileId
    const existing = await prisma.video.findUnique({
      where: { driveFileId: driveFile.id },
    });

    if (existing) {
      continue;
    }

    // Insert new video record in MySQL
    const video = await prisma.video.create({
      data: {
        userId,
        driveFolderId: driveFolder.id,
        driveFileId: driveFile.id,
        filename: driveFile.name,
        fileSize: BigInt(driveFile.size),
        mimeType: driveFile.mimeType,
        driveWebViewLink: driveFile.webViewLink,
        driveThumbnailLink: driveFile.thumbnailLink,
        status: VideoStatus.DISCOVERED,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.VIDEO_DISCOVERED,
        entity: 'Video',
        entityId: video.id,
        metadata: {
          filename: video.filename,
          driveFileId: video.driveFileId,
          size: driveFile.size,
        },
      },
    });

    // Check system settings for auto-processing
    const autoProcessSetting = await prisma.systemSetting.findUnique({
      where: { key: 'auto_processing' },
    });
    const isAutoProcess = autoProcessSetting ? autoProcessSetting.value === 'true' : true;

    if (isAutoProcess) {
      await videoProcessingQueue.add(
        'process-video',
        {
          videoId: video.id,
          userId,
        },
        {
          jobId: `video-${video.id}`,
        }
      );
    }

    newCount++;
  }

  // Update folder sync timestamp
  await prisma.driveFolder.update({
    where: { id: driveFolder.id },
    data: { lastSyncedAt: new Date() },
  });

  // Notify user
  if (newCount > 0) {
    await notificationsQueue.add('send-notification', {
      userId,
      title: 'New Videos Detected',
      message: `Detected ${newCount} new video(s) in Drive folder "${driveFolder.folderName}".`,
      type: 'INFO',
      link: '/videos',
    });
  }

  return { newVideosCount: newCount };
}
