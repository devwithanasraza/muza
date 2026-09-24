import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

export interface DriveAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
}

export interface DriveVideoFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export class GoogleDriveService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/drive/callback`;
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  public getOAuth2Client() {
    if (!this.isConfigured()) {
      throw new Error('Google Drive integration not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
    }
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  public getAuthorizationUrl(state: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  public async exchangeCode(code: string): Promise<{ tokens: DriveAuthTokens; email?: string; name?: string }> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user info to store account email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      tokens: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      },
      email: userInfo.data.email || undefined,
      name: userInfo.data.name || undefined,
    };
  }

  private getDriveClient(tokens: DriveAuthTokens): drive_v3.Drive {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || undefined,
      expiry_date: tokens.expiryDate || undefined,
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  public async listFolders(tokens: DriveAuthTokens): Promise<Array<{ id: string; name: string }>> {
    const drive = this.getDriveClient(tokens);
    const res = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
      pageSize: 100,
      orderBy: 'folder,name',
    });

    return (
      res.data.files?.map((f) => ({
        id: f.id || '',
        name: f.name || 'Untitled Folder',
      })) || []
    );
  }

  public async scanFolderVideos(tokens: DriveAuthTokens, folderId: string): Promise<DriveVideoFile[]> {
    const drive = this.getDriveClient(tokens);
    const videoMimeQuery =
      "mimeType = 'video/mp4' or mimeType = 'video/quicktime' or mimeType = 'video/x-m4v' or mimeType = 'video/webm'";
    const query = `'${folderId}' in parents and (${videoMimeQuery}) and trashed = false`;

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, createdTime, modifiedTime)',
      pageSize: 100,
      orderBy: 'modifiedTime desc',
    });

    return (
      res.data.files?.map((f) => ({
        id: f.id || '',
        name: f.name || 'unnamed-video',
        mimeType: f.mimeType || 'video/mp4',
        size: Number(f.size || 0),
        webViewLink: f.webViewLink || undefined,
        thumbnailLink: f.thumbnailLink || undefined,
        createdTime: f.createdTime || undefined,
        modifiedTime: f.modifiedTime || undefined,
      })) || []
    );
  }

  public async downloadFile(tokens: DriveAuthTokens, fileId: string, destinationPath: string): Promise<string> {
    const drive = this.getDriveClient(tokens);
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const writeStream = fs.createWriteStream(destinationPath);
    await pipeline(res.data, writeStream);
    return destinationPath;
  }
}

export const googleDriveService = new GoogleDriveService();
