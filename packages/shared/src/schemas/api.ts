import { z } from 'zod';
import { SocialPlatform, UserRole, YouTubePrivacy } from '../enums.js';

export const RegisterRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(UserRole).default(UserRole.OWNER),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UpdateBrandProfileSchema = z.object({
  brandName: z.string().min(1),
  niche: z.string().default(''),
  audience: z.string().default(''),
  language: z.string().default('English'),
  tone: z.string().default('Professional & Engaging'),
  descriptionStyle: z.string().default('Concise and informative'),
  captionStyle: z.string().default('Punchy with clear call to action'),
  defaultCTA: z.string().default('Follow for more insights!'),
  defaultHashtags: z.array(z.string()).default([]),
  forbiddenWords: z.array(z.string()).default([]),
  preferredWords: z.array(z.string()).default([]),
  emojiPolicy: z.enum(['NONE', 'MINIMAL', 'STANDARD', 'EXPRESSIVE']).default('STANDARD'),
});

export type UpdateBrandProfileInput = z.infer<typeof UpdateBrandProfileSchema>;

export const UpdateVariantSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  caption: z.string().max(2200).optional(),
  tags: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  cta: z.string().optional(),
  hook: z.string().optional(),
  category: z.string().optional(),
  privacy: z.nativeEnum(YouTubePrivacy).optional(),
});

export type UpdateVariantInput = z.infer<typeof UpdateVariantSchema>;

export const SchedulePublishSchema = z.object({
  contentVariantId: z.string().uuid(),
  socialAccountId: z.string().uuid(),
  platform: z.nativeEnum(SocialPlatform),
  scheduledAt: z.string().datetime({ message: 'Must be ISO date-time string' }).optional(),
  publishNow: z.boolean().default(false),
  timezone: z.string().default('Asia/Kolkata'),
});

export type SchedulePublishInput = z.infer<typeof SchedulePublishSchema>;

export const SystemSettingsSchema = z.object({
  aiProvider: z.string().default('openai'),
  aiModel: z.string().default('gpt-4o'),
  defaultLanguage: z.string().default('English'),
  defaultTimezone: z.string().default('Asia/Kolkata'),
  defaultYouTubePrivacy: z.nativeEnum(YouTubePrivacy).default(YouTubePrivacy.PRIVATE),
  autoProcessing: z.boolean().default(true),
  autoGenerateContent: z.boolean().default(true),
  requireApproval: z.boolean().default(true),
  autoPublish: z.boolean().default(false), // IMPORTANT: Auto Publish must be OFF by default
  maxRetryLimits: z.number().int().min(1).max(10).default(4),
  notificationEmail: z.string().email().optional().or(z.literal('')),
});

export type SystemSettingsInput = z.infer<typeof SystemSettingsSchema>;
