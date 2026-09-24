import { VideoStatus, SocialPlatform, PublishJobStatus, YouTubePrivacy } from './enums.js';

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveFolderDto {
  id: string;
  folderId: string;
  folderName: string;
  folderPath: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
}

export interface VideoDto {
  id: string;
  driveFileId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: VideoStatus;
  duration: number | null;
  driveThumbnailLink: string | null;
  driveWebViewLink: string | null;
  createdAt: string;
  updatedAt: string;
  analysis?: {
    id: string;
    summary: string;
    detectedLanguage: string;
    topics: string[];
    keywords: string[];
    confidence: number;
  } | null;
  variants?: Array<{
    id: string;
    platform: SocialPlatform;
    title: string | null;
    caption: string | null;
    tags: string[];
    hashtags: string[];
    isApproved: boolean;
    status: string;
  }>;
}

export interface DashboardMetricsDto {
  totalVideos: number;
  pendingReview: number;
  scheduled: number;
  published: number;
  failed: number;
  integrations: {
    googleDrive: { connected: boolean; email?: string | null; error?: string | null };
    youtube: { connected: boolean; channelName?: string | null; error?: string | null };
    instagram: { connected: boolean; accountName?: string | null; error?: string | null };
  };
}
