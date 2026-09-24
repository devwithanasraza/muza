import { google, youtube_v3 } from 'googleapis';
import fs from 'fs';
import { YouTubePrivacy } from '@muza/shared';

export interface YouTubeAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
}

export interface YouTubeUploadParams {
  filePath: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: YouTubePrivacy;
  onProgress?: (progress: number) => void;
}

export class YouTubeService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/youtube/callback`;
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  public getOAuth2Client() {
    if (!this.isConfigured()) {
      throw new Error('YouTube integration not configured. Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET.');
    }
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  public getAuthorizationUrl(state: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  public async exchangeCode(code: string): Promise<{ tokens: YouTubeAuthTokens; channelId?: string; channelTitle?: string }> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
    });

    const channel = channelRes.data.items?.[0];

    return {
      tokens: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      },
      channelId: channel?.id || undefined,
      channelTitle: channel?.snippet?.title || undefined,
    };
  }

  private getYouTubeClient(tokens: YouTubeAuthTokens): youtube_v3.Youtube {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || undefined,
      expiry_date: tokens.expiryDate || undefined,
    });

    return google.youtube({ version: 'v3', auth: oauth2Client });
  }

  public async uploadVideo(tokens: YouTubeAuthTokens, params: YouTubeUploadParams): Promise<{ videoId: string; videoUrl: string }> {
    const youtube = this.getYouTubeClient(tokens);

    if (!fs.existsSync(params.filePath)) {
      throw new Error(`Video file not found at path: ${params.filePath}`);
    }

    const fileSize = fs.statSync(params.filePath).size;
    const privacy = (params.privacyStatus || YouTubePrivacy.PRIVATE).toLowerCase();

    const res = await youtube.videos.insert(
      {
        part: ['snippet', 'status'],
        notifySubscribers: privacy === 'public',
        requestBody: {
          snippet: {
            title: params.title.slice(0, 100),
            description: params.description.slice(0, 5000),
            tags: params.tags?.slice(0, 50),
            categoryId: params.categoryId || '22',
          },
          status: {
            privacyStatus: privacy,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(params.filePath),
        },
      },
      {
        onUploadProgress: (evt) => {
          if (params.onProgress && fileSize > 0) {
            const progress = (evt.bytesRead / fileSize) * 100;
            params.onProgress(Math.min(100, Math.round(progress)));
          }
        },
      }
    );

    const videoId = res.data.id;
    if (!videoId) {
      throw new Error('Failed to retrieve video ID from YouTube API response.');
    }

    return {
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  public async getVideoMetrics(tokens: YouTubeAuthTokens, videoId: string): Promise<{ views: number; likes: number; comments: number }> {
    const youtube = this.getYouTubeClient(tokens);
    const res = await youtube.videos.list({
      part: ['statistics'],
      id: [videoId],
    });

    const stats = res.data.items?.[0]?.statistics;
    return {
      views: Number(stats?.viewCount || 0),
      likes: Number(stats?.likeCount || 0),
      comments: Number(stats?.commentCount || 0),
    };
  }
}

export const youtubeService = new YouTubeService();
