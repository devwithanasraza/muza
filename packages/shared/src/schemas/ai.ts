import { z } from 'zod';

export const YouTubeContentSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(100, 'YouTube title cannot exceed 100 characters'),
  description: z.string().max(5000, 'YouTube description cannot exceed 5000 characters'),
  tags: z.array(z.string().min(1)).max(500, 'Total tags limit'),
  keywords: z.array(z.string()).default([]),
  category: z.string().default('22'), // '22' is People & Blogs in YouTube categories
  cta: z.string().default(''),
});

export type YouTubeContent = z.infer<typeof YouTubeContentSchema>;

export const InstagramContentSchema = z.object({
  caption: z.string().min(1, 'Caption cannot be empty').max(2200, 'Instagram caption cannot exceed 2200 characters'),
  hashtags: z.array(z.string().regex(/^#?[a-zA-Z0-9_]+$/, 'Invalid hashtag format')).max(30, 'Max 30 hashtags allowed by Instagram'),
  cta: z.string().default(''),
  hook: z.string().default(''),
});

export type InstagramContent = z.infer<typeof InstagramContentSchema>;

export const ContentJsonSchema = z.object({
  youtube: YouTubeContentSchema,
  instagram: InstagramContentSchema,
});

export type ContentJson = z.infer<typeof ContentJsonSchema>;

export const VideoAnalysisSchema = z.object({
  transcript: z.string(),
  detectedLanguage: z.string().default('en'),
  topics: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  summary: z.string().default(''),
  hook: z.string().default(''),
  targetAudience: z.string().default(''),
  contentCategory: z.string().default(''),
  visualSummary: z.string().default(''),
  duration: z.number().nonnegative().default(0),
  confidence: z.number().min(0).max(1).default(0.9),
});

export type VideoAnalysisData = z.infer<typeof VideoAnalysisSchema>;
