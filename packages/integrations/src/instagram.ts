import axios from 'axios';

export interface InstagramAuthTokens {
  accessToken: string;
  tokenExpiresAt?: Date | null;
}

export interface InstagramAccountInfo {
  id: string; // IG user ID
  username: string;
  name?: string;
  profilePictureUrl?: string;
}

export class InstagramService {
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private graphApiBase = 'https://graph.facebook.com/v19.0';

  constructor() {
    this.appId = process.env.META_APP_ID || '';
    this.appSecret = process.env.META_APP_SECRET || '';
    this.redirectUri = process.env.META_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/instagram/callback`;
  }

  public isConfigured(): boolean {
    return Boolean(this.appId && this.appSecret);
  }

  public getAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('Meta/Instagram integration not configured. Missing META_APP_ID or META_APP_SECRET.');
    }
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ].join(',');

    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(state)}`;
  }

  public async exchangeCode(code: string): Promise<{ accessToken: string; accounts: InstagramAccountInfo[] }> {
    if (!this.isConfigured()) {
      throw new Error('Meta/Instagram integration not configured.');
    }

    // 1. Exchange short-lived code for access token
    const tokenRes = await axios.get(`${this.graphApiBase}/oauth/access_token`, {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      },
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived access token
    const longLivedRes = await axios.get(`${this.graphApiBase}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longLivedRes.data.access_token;

    // 3. Find connected Instagram Business Accounts via Facebook Pages
    const accounts = await this.getConnectedInstagramAccounts(longLivedToken);

    return {
      accessToken: longLivedToken,
      accounts,
    };
  }

  public async getConnectedInstagramAccounts(userAccessToken: string): Promise<InstagramAccountInfo[]> {
    const pagesRes = await axios.get(`${this.graphApiBase}/me/accounts`, {
      params: {
        access_token: userAccessToken,
        fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url}',
      },
    });

    const accounts: InstagramAccountInfo[] = [];
    const pages = pagesRes.data.data || [];

    for (const page of pages) {
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        accounts.push({
          id: ig.id,
          username: ig.username,
          name: ig.name || page.name,
          profilePictureUrl: ig.profile_picture_url,
        });
      }
    }

    return accounts;
  }

  public async publishReel(
    accessToken: string,
    igUserId: string,
    videoUrl: string,
    caption: string
  ): Promise<{ mediaId: string; permalink?: string }> {
    // Step 1: Create media container for Reel
    const containerRes = await axios.post(`${this.graphApiBase}/${igUserId}/media`, null, {
      params: {
        access_token: accessToken,
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption.slice(0, 2200),
        share_to_feed: true,
      },
    });

    const containerId = containerRes.data.id;
    if (!containerId) {
      throw new Error('Failed to create Instagram Reel container');
    }

    // Step 2: Poll container status until ready
    let isReady = false;
    let attempts = 0;
    const maxPollAttempts = 30; // ~60 seconds max

    while (!isReady && attempts < maxPollAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusRes = await axios.get(`${this.graphApiBase}/${containerId}`, {
        params: {
          access_token: accessToken,
          fields: 'status_code,status',
        },
      });

      const statusCode = statusRes.data.status_code;
      if (statusCode === 'FINISHED') {
        isReady = true;
      } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
        throw new Error(`Instagram container processing failed with status: ${statusCode} (${statusRes.data.status})`);
      }
    }

    if (!isReady) {
      throw new Error('Instagram Reel container processing timed out before publication.');
    }

    // Step 3: Publish container
    const publishRes = await axios.post(`${this.graphApiBase}/${igUserId}/media_publish`, null, {
      params: {
        access_token: accessToken,
        creation_id: containerId,
      },
    });

    const mediaId = publishRes.data.id;

    // Step 4: Fetch permalink
    let permalink: string | undefined;
    try {
      const mediaInfoRes = await axios.get(`${this.graphApiBase}/${mediaId}`, {
        params: {
          access_token: accessToken,
          fields: 'permalink',
        },
      });
      permalink = mediaInfoRes.data.permalink;
    } catch {
      // Non-critical if permalink fetch fails immediately
    }

    return {
      mediaId,
      permalink,
    };
  }

  public async getMediaMetrics(
    accessToken: string,
    mediaId: string
  ): Promise<{ reach?: number; plays?: number; likes?: number; comments?: number; saved?: number; shares?: number }> {
    try {
      const res = await axios.get(`${this.graphApiBase}/${mediaId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'reach,plays,likes,comments,saved,shares',
        },
      });

      const metricsMap: Record<string, number> = {};
      for (const item of res.data.data || []) {
        metricsMap[item.name] = Number(item.values?.[0]?.value || 0);
      }

      return {
        reach: metricsMap.reach || 0,
        plays: metricsMap.plays || 0,
        likes: metricsMap.likes || 0,
        comments: metricsMap.comments || 0,
        saved: metricsMap.saved || 0,
        shares: metricsMap.shares || 0,
      };
    } catch {
      return {};
    }
  }
}

export const instagramService = new InstagramService();
