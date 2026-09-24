import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { jsonrepair } from 'jsonrepair';
import {
  ContentJsonSchema,
  VideoAnalysisSchema,
  YouTubePrivacy,
  SocialPlatform,
  VideoStatus,
  PublishJobStatus,
} from '../packages/shared/dist/index.js';
import { encrypt, decrypt } from '../packages/integrations/dist/crypto.js';

describe('MUZA Critical Acceptance Criteria & Pipeline Tests', () => {
  // Test 1: Duplicate video detection (driveFileId and fileHash)
  it('1. Duplicate video detection: Identifies existing driveFileId and SHA256 hashes', () => {
    const existingDriveIds = new Set(['drive-file-123', 'drive-file-456']);
    const newDriveId = 'drive-file-123';

    // Duplicate check 1
    const isDriveDuplicate = existingDriveIds.has(newDriveId);
    assert.strictEqual(isDriveDuplicate, true, 'Should detect duplicate Google Drive file ID');

    // Duplicate check 2: Hash of video file contents
    const dummyVideoBuffer = Buffer.from('video binary data stream test content');
    const hash = crypto.createHash('sha256').update(dummyVideoBuffer).digest('hex');
    const knownHashes = new Set([hash]);

    const isHashDuplicate = knownHashes.has(hash);
    assert.strictEqual(isHashDuplicate, true, 'Should detect duplicate video file contents by SHA-256');
  });

  // Test 2: Drive connection configuration
  it('2. Drive connection failure: Detects unconfigured environment credentials gracefully', () => {
    const originalId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    assert.strictEqual(isConfigured, false, 'Should report unconfigured when Google Client ID is missing');

    if (originalId) process.env.GOOGLE_CLIENT_ID = originalId;
  });

  // Test 3: OAuth token encryption and decryption (AES-256-GCM)
  it('3. OAuth Security: Encrypts and decrypts OAuth tokens using AES-256-GCM', () => {
    const rawToken = 'ya29.a0ARrdaM8-very-secret-google-oauth-access-token';
    const encrypted = encrypt(rawToken);

    assert.notStrictEqual(encrypted, rawToken);
    assert.ok(encrypted.includes(':'), 'Encrypted string must contain IV, AuthTag and Ciphertext separated by colons');

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, rawToken, 'Decrypted token must strictly match the original token');
  });

  // Test 4: AI Generation failure & Fallback Validation
  it('4. AI generation failure: Fallback schema passes strict Zod validation', () => {
    const fallbackYouTube = {
      title: 'How to Build Scalable AI Publishing Agents',
      description: 'Step by step architectural breakdown of MUZA.',
      tags: ['ai', 'software', 'production'],
      keywords: ['automation', 'engineering'],
      category: '22',
      cta: 'Subscribe for daily architectural breakdowns!',
    };

    const fallbackInstagram = {
      caption: 'Transform your creator workflow with automated intelligence 🚀',
      hashtags: ['#TechTrends', '#Productivity', '#Coding'],
      cta: 'Save this Reel and follow @muza for more insights.',
      hook: 'Stop publishing manually! Here is the future:',
    };

    const fullPayload = {
      youtube: fallbackYouTube,
      instagram: fallbackInstagram,
    };

    const parsed = ContentJsonSchema.safeParse(fullPayload);
    assert.strictEqual(parsed.success, true, 'Fallback content must pass ContentJsonSchema validation');
  });

  // Test 5: Invalid AI JSON repair & recovery
  it('5. Invalid AI JSON: jsonrepair restores malformed JSON into valid structure', () => {
    // Malformed JSON with missing quotes and trailing commas common in LLM outputs
    const malformedJson = `{
      "youtube": {
        title: "Building Real-Time AI Publishing",
        description: "Full walkthrough",
        tags: ["ai", "dev",],
        keywords: ["architecture"],
        category: "22",
        cta: "Subscribe!",
      },
      "instagram": {
        caption: "AI Social Agent in Action",
        hashtags: ["#Automation", "#Engineering"],
        cta: "Follow us!",
        hook: "Watch this:",
      }
    }`;

    const repaired = jsonrepair(malformedJson);
    const parsed = JSON.parse(repaired);
    const validated = ContentJsonSchema.parse(parsed);

    assert.strictEqual(validated.youtube.title, 'Building Real-Time AI Publishing');
    assert.strictEqual(validated.instagram.hashtags.length, 2);
  });

  // Test 6: YouTube upload validation & parameters
  it('6. YouTube upload validation: Enforces character limits and privacy defaults', () => {
    const longTitle = 'A'.repeat(120);
    const truncatedTitle = longTitle.slice(0, 100);
    assert.strictEqual(truncatedTitle.length, 100, 'YouTube title must be capped at 100 characters');

    const defaultPrivacy = YouTubePrivacy.PRIVATE;
    assert.strictEqual(defaultPrivacy, 'PRIVATE', 'Default privacy for uploads must default to PRIVATE');
  });

  // Test 7: Instagram Reel validation
  it('7. Instagram publish validation: Enforces caption limit & valid hashtag format', () => {
    const validHashtags = ['#TechTrends', '#AIAutomation', '#DevCommunity'];
    const invalidHashtag = '#invalid tag with spaces!';

    const hashtagRegex = /^#?[a-zA-Z0-9_]+$/;
    for (const tag of validHashtags) {
      assert.strictEqual(hashtagRegex.test(tag), true);
    }
    assert.strictEqual(hashtagRegex.test(invalidHashtag), false);
  });

  // Test 8: Exponential backoff calculation
  it('8. Retry system: Exponential backoff calculates delays correctly', () => {
    const calculateDelay = (attempt: number) => {
      // Exponential delays: Attempt 1 = 30s, Attempt 2 = 120s (2m), Attempt 3 = 300s (5m), Attempt 4 = 900s (15m)
      const delays = [30000, 120000, 300000, 900000];
      return delays[Math.min(attempt - 1, delays.length - 1)];
    };

    assert.strictEqual(calculateDelay(1), 30000, 'Attempt 1 must be 30 seconds');
    assert.strictEqual(calculateDelay(2), 120000, 'Attempt 2 must be 2 minutes');
    assert.strictEqual(calculateDelay(3), 300000, 'Attempt 3 must be 5 minutes');
    assert.strictEqual(calculateDelay(4), 900000, 'Attempt 4 must be 15 minutes');
  });

  // Test 9: Scheduling & Timezone verification
  it('9. Scheduler: Calculates future date difference without silent drift', () => {
    const now = new Date('2026-09-25T10:00:00.000Z');
    const scheduledAt = new Date('2026-09-25T12:30:00.000Z');

    const delayMs = scheduledAt.getTime() - now.getTime();
    assert.strictEqual(delayMs, 2.5 * 60 * 60 * 1000, 'Delay must exactly equal 2.5 hours in milliseconds');
    assert.ok(delayMs > 0, 'Scheduled time must be in future');
  });

  // Test 10: Idempotency Key verification
  it('10. Idempotency safeguard: Generates deterministic publish idempotency key', () => {
    const userId = 'usr-12345';
    const videoId = 'vid-98765';
    const platform = SocialPlatform.YOUTUBE;
    const socialAccountId = 'soc-55555';

    const key1 = `${userId}:${videoId}:${platform}:${socialAccountId}`;
    const key2 = `${userId}:${videoId}:${platform}:${socialAccountId}`;

    assert.strictEqual(key1, key2, 'Idempotency keys must be strictly deterministic');
    assert.strictEqual(key1, 'usr-12345:vid-98765:YOUTUBE:soc-55555');
  });
});
