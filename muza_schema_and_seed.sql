-- ============================================================
-- MUZA AI Publishing Platform - MySQL 8+ Full Schema & Seed Dump
-- Import this file directly into Hostinger phpMyAdmin
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NULL,
  `avatarUrl` VARCHAR(1000) NULL,
  `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'OWNER',
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `users_email_key`(`email`),
  INDEX `users_role_idx`(`role`),
  INDEX `users_status_idx`(`status`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sessions Table
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(512) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(512) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sessions_token_key`(`token`),
  INDEX `sessions_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Brand Profiles Table
DROP TABLE IF EXISTS `brand_profiles`;
CREATE TABLE `brand_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `brandName` VARCHAR(191) NOT NULL,
  `niche` VARCHAR(191) NULL,
  `audience` TEXT NULL,
  `language` VARCHAR(191) NOT NULL DEFAULT 'English',
  `tone` VARCHAR(191) NOT NULL DEFAULT 'Professional & Engaging',
  `descriptionStyle` TEXT NULL,
  `captionStyle` TEXT NULL,
  `defaultCTA` TEXT NULL,
  `defaultHashtags` JSON NULL,
  `forbiddenWords` JSON NULL,
  `preferredWords` JSON NULL,
  `emojiPolicy` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
  `isDefault` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `brand_profiles_userId_idx`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `brand_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Drive Connections Table
DROP TABLE IF EXISTS `drive_connections`;
CREATE TABLE `drive_connections` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `accountEmail` VARCHAR(191) NULL,
  `accountName` VARCHAR(191) NULL,
  `accessTokenEncrypted` TEXT NOT NULL,
  `refreshTokenEncrypted` TEXT NULL,
  `tokenExpiresAt` DATETIME(3) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'CONNECTED',
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `drive_connections_userId_idx`(`userId`),
  INDEX `drive_connections_status_idx`(`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `drive_connections_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Drive Folders Table
DROP TABLE IF EXISTS `drive_folders`;
CREATE TABLE `drive_folders` (
  `id` VARCHAR(191) NOT NULL,
  `driveConnectionId` VARCHAR(191) NOT NULL,
  `folderId` VARCHAR(191) NOT NULL,
  `folderName` VARCHAR(191) NOT NULL,
  `folderPath` VARCHAR(1000) NULL,
  `syncEnabled` BOOLEAN NOT NULL DEFAULT true,
  `lastSyncedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `drive_folders_driveConnectionId_folderId_key`(`driveConnectionId`, `folderId`),
  INDEX `drive_folders_folderId_idx`(`folderId`),
  INDEX `drive_folders_driveConnectionId_idx`(`driveConnectionId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `drive_folders_driveConnectionId_fkey` FOREIGN KEY (`driveConnectionId`) REFERENCES `drive_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Videos Table
DROP TABLE IF EXISTS `videos`;
CREATE TABLE `videos` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `driveFolderId` VARCHAR(191) NULL,
  `driveFileId` VARCHAR(191) NOT NULL,
  `filename` VARCHAR(500) NOT NULL,
  `fileHash` VARCHAR(128) NULL,
  `fileSize` BIGINT NOT NULL DEFAULT 0,
  `mimeType` VARCHAR(100) NOT NULL,
  `driveWebViewLink` VARCHAR(1000) NULL,
  `driveThumbnailLink` VARCHAR(1000) NULL,
  `status` ENUM('DISCOVERED', 'DOWNLOADING', 'DOWNLOADED', 'PROCESSING', 'ANALYZING', 'GENERATING_CONTENT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED', 'ARCHIVED') NOT NULL DEFAULT 'DISCOVERED',
  `duration` DOUBLE NULL DEFAULT 0,
  `localPath` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `videos_driveFileId_key`(`driveFileId`),
  INDEX `videos_userId_idx`(`userId`),
  INDEX `videos_status_idx`(`status`),
  INDEX `videos_fileHash_idx`(`fileHash`),
  INDEX `videos_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `videos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `videos_driveFolderId_fkey` FOREIGN KEY (`driveFolderId`) REFERENCES `drive_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Video Processing Jobs
DROP TABLE IF EXISTS `video_processing_jobs`;
CREATE TABLE `video_processing_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `stage` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `error` TEXT NULL,
  `retryCount` INT NOT NULL DEFAULT 0,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `video_processing_jobs_videoId_idx`(`videoId`),
  INDEX `video_processing_jobs_status_idx`(`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `video_processing_jobs_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Video Analysis
DROP TABLE IF EXISTS `video_analysis`;
CREATE TABLE `video_analysis` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `transcript` LONGTEXT NOT NULL,
  `detectedLanguage` VARCHAR(191) NOT NULL DEFAULT 'en',
  `topics` JSON NULL,
  `keywords` JSON NULL,
  `entities` JSON NULL,
  `summary` TEXT NULL,
  `hook` TEXT NULL,
  `targetAudience` TEXT NULL,
  `contentCategory` VARCHAR(100) NULL,
  `visualSummary` TEXT NULL,
  `duration` DOUBLE NULL DEFAULT 0,
  `confidence` DOUBLE NOT NULL DEFAULT 0.9,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `video_analysis_videoId_key`(`videoId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `video_analysis_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. AI Generations
DROP TABLE IF EXISTS `ai_generations`;
CREATE TABLE `ai_generations` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `brandProfileId` VARCHAR(191) NULL,
  `promptVersion` VARCHAR(191) NOT NULL DEFAULT 'v1',
  `rawResponse` LONGTEXT NULL,
  `isValidJson` BOOLEAN NOT NULL DEFAULT true,
  `model` VARCHAR(191) NOT NULL DEFAULT 'gpt-4o',
  `tokensUsed` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `ai_generations_videoId_idx`(`videoId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_generations_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_generations_brandProfileId_fkey` FOREIGN KEY (`brandProfileId`) REFERENCES `brand_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Content Variants
DROP TABLE IF EXISTS `content_variants`;
CREATE TABLE `content_variants` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `platform` ENUM('YOUTUBE', 'INSTAGRAM') NOT NULL,
  `title` VARCHAR(500) NULL,
  `description` TEXT NULL,
  `caption` TEXT NULL,
  `tags` JSON NULL,
  `keywords` JSON NULL,
  `hashtags` JSON NULL,
  `cta` TEXT NULL,
  `hook` TEXT NULL,
  `category` VARCHAR(100) NULL,
  `privacy` ENUM('PRIVATE', 'UNLISTED', 'PUBLIC') NOT NULL DEFAULT 'PRIVATE',
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `isApproved` BOOLEAN NOT NULL DEFAULT false,
  `approvedAt` DATETIME(3) NULL,
  `approvedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `content_variants_videoId_idx`(`videoId`),
  INDEX `content_variants_platform_idx`(`platform`),
  INDEX `content_variants_isApproved_idx`(`isApproved`),
  PRIMARY KEY (`id`),
  CONSTRAINT `content_variants_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Social Accounts
DROP TABLE IF EXISTS `social_accounts`;
CREATE TABLE `social_accounts` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `platform` ENUM('YOUTUBE', 'INSTAGRAM') NOT NULL,
  `accountName` VARCHAR(191) NOT NULL,
  `externalAccountId` VARCHAR(191) NOT NULL,
  `accessTokenEncrypted` TEXT NOT NULL,
  `refreshTokenEncrypted` TEXT NULL,
  `tokenExpiresAt` DATETIME(3) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'CONNECTED',
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `social_accounts_userId_platform_externalAccountId_key`(`userId`, `platform`, `externalAccountId`),
  INDEX `social_accounts_userId_idx`(`userId`),
  INDEX `social_accounts_platform_idx`(`platform`),
  INDEX `social_accounts_status_idx`(`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `social_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Publish Jobs
DROP TABLE IF EXISTS `publish_jobs`;
CREATE TABLE `publish_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `contentVariantId` VARCHAR(191) NOT NULL,
  `socialAccountId` VARCHAR(191) NOT NULL,
  `platform` ENUM('YOUTUBE', 'INSTAGRAM') NOT NULL,
  `scheduledAt` DATETIME(3) NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `idempotencyKey` VARCHAR(255) NOT NULL,
  `attemptCount` INT NOT NULL DEFAULT 0,
  `maxAttempts` INT NOT NULL DEFAULT 4,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `publish_jobs_idempotencyKey_key`(`idempotencyKey`),
  INDEX `publish_jobs_videoId_idx`(`videoId`),
  INDEX `publish_jobs_socialAccountId_idx`(`socialAccountId`),
  INDEX `publish_jobs_status_idx`(`status`),
  INDEX `publish_jobs_scheduledAt_idx`(`scheduledAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `publish_jobs_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `publish_jobs_contentVariantId_fkey` FOREIGN KEY (`contentVariantId`) REFERENCES `content_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `publish_jobs_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Publish Attempts
DROP TABLE IF EXISTS `publish_attempts`;
CREATE TABLE `publish_attempts` (
  `id` VARCHAR(191) NOT NULL,
  `publishJobId` VARCHAR(191) NOT NULL,
  `attemptNumber` INT NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `error` TEXT NULL,
  `responsePayload` JSON NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  INDEX `publish_attempts_publishJobId_idx`(`publishJobId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `publish_attempts_publishJobId_fkey` FOREIGN KEY (`publishJobId`) REFERENCES `publish_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Published Posts
DROP TABLE IF EXISTS `published_posts`;
CREATE TABLE `published_posts` (
  `id` VARCHAR(191) NOT NULL,
  `publishJobId` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `socialAccountId` VARCHAR(191) NOT NULL,
  `platform` ENUM('YOUTUBE', 'INSTAGRAM') NOT NULL,
  `externalPostId` VARCHAR(255) NOT NULL,
  `externalUrl` VARCHAR(1000) NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `metrics` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `published_posts_publishJobId_key`(`publishJobId`),
  INDEX `published_posts_videoId_idx`(`videoId`),
  INDEX `published_posts_socialAccountId_idx`(`socialAccountId`),
  INDEX `published_posts_platform_idx`(`platform`),
  INDEX `published_posts_externalPostId_idx`(`externalPostId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `published_posts_publishJobId_fkey` FOREIGN KEY (`publishJobId`) REFERENCES `publish_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `published_posts_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `published_posts_socialAccountId_fkey` FOREIGN KEY (`socialAccountId`) REFERENCES `social_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Hashtags Table
DROP TABLE IF EXISTS `hashtags`;
CREATE TABLE `hashtags` (
  `id` VARCHAR(191) NOT NULL,
  `tag` VARCHAR(100) NOT NULL,
  `category` VARCHAR(191) NOT NULL DEFAULT 'general',
  `relevanceScore` DOUBLE NOT NULL DEFAULT 1,
  `source` VARCHAR(191) NOT NULL DEFAULT 'curated',
  `lastCheckedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `hashtags_tag_key`(`tag`),
  INDEX `hashtags_category_idx`(`category`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Notifications Table
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'INFO',
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `link` VARCHAR(500) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `notifications_userId_idx`(`userId`),
  INDEX `notifications_isRead_idx`(`isRead`),
  INDEX `notifications_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Audit Logs Table
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `entityId` VARCHAR(255) NULL,
  `ipAddress` VARCHAR(64) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `audit_logs_userId_idx`(`userId`),
  INDEX `audit_logs_action_idx`(`action`),
  INDEX `audit_logs_entity_idx`(`entity`),
  INDEX `audit_logs_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. System Settings Table
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `description` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `system_settings_key_key`(`key`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA (Pre-configured Administrator, Brand & Settings)
-- ============================================================

-- Seed 1: Administrator User (email: admin@muza.ai, password: MuzaAdmin123!)
INSERT INTO `users` (`id`, `name`, `email`, `passwordHash`, `role`, `status`, `createdAt`, `updatedAt`)
VALUES (
  'usr-muza-admin-001',
  'MUZA Administrator',
  'admin@muza.ai',
  '$2b$10$wEeVgGq2s7bIvxX6pY7w8e2k2tNlK0P8x1D7Z8t.s3fW4uN0s.eOm',
  'OWNER',
  'ACTIVE',
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed 2: Default Brand Profile
INSERT INTO `brand_profiles` (`id`, `userId`, `brandName`, `niche`, `audience`, `language`, `tone`, `descriptionStyle`, `captionStyle`, `defaultCTA`, `defaultHashtags`, `forbiddenWords`, `preferredWords`, `emojiPolicy`, `isDefault`, `createdAt`, `updatedAt`)
VALUES (
  'bp-muza-default-001',
  'usr-muza-admin-001',
  'TechVision Studio',
  'Technology & Software Engineering',
  'Developers, creators and modern tech innovators',
  'English',
  'Insightful, Authoritative, and Energetic',
  'Structured highlights with timestamps and links',
  'Punchy hook line with question and call to action',
  'Subscribe to MUZA & drop your questions below!',
  '["#AI", "#TechNews", "#SoftwareEngineering", "#Automation", "#Coding"]',
  '["clickbait", "cheap", "scam", "guaranteed"]',
  '["production-grade", "architecture", "scalability", "innovation"]',
  'STANDARD',
  1,
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE `brandName`=`brandName`;

-- Seed 3: Default System Settings
INSERT INTO `system_settings` (`id`, `key`, `value`, `description`, `updatedAt`) VALUES
('st-001', 'ai_provider', 'openai', 'Primary AI provider', NOW(3)),
('st-002', 'ai_model', 'gpt-4o', 'Model identifier for analysis and copy generation', NOW(3)),
('st-003', 'default_language', 'English', 'Default language for generated content', NOW(3)),
('st-004', 'default_timezone', 'Asia/Kolkata', 'Application scheduling timezone', NOW(3)),
('st-005', 'default_youtube_privacy', 'PRIVATE', 'Default YouTube upload privacy', NOW(3)),
('st-006', 'auto_processing', 'true', 'Automatically process newly discovered videos', NOW(3)),
('st-007', 'auto_generate_content', 'true', 'Automatically generate social copy upon video processing', NOW(3)),
('st-008', 'require_approval', 'true', 'Require user review and approval before publishing', NOW(3)),
('st-009', 'auto_publish', 'false', 'Automatically publish approved posts (strictly false by default)', NOW(3)),
('st-010', 'max_retry_limits', '4', 'Maximum retry attempts for failed publishing jobs', NOW(3))
ON DUPLICATE KEY UPDATE `value`=`value`;

-- Seed 4: Default Curated Hashtags
INSERT INTO `hashtags` (`id`, `tag`, `category`, `relevanceScore`, `source`, `createdAt`, `updatedAt`) VALUES
('ht-001', 'AIAutomation', 'primary', 0.95, 'curated', NOW(3), NOW(3)),
('ht-002', 'SoftwareArchitecture', 'niche', 0.90, 'curated', NOW(3), NOW(3)),
('ht-003', 'DevCommunity', 'audience', 0.85, 'curated', NOW(3), NOW(3)),
('ht-004', 'TechReels', 'discovery', 0.88, 'curated', NOW(3), NOW(3)),
('ht-005', 'MuzaAI', 'brand', 1.00, 'curated', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `tag`=`tag`;

SET FOREIGN_KEY_CHECKS = 1;
