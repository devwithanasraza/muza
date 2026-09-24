import { ContentJson, VideoAnalysisData } from '@muza/shared';

export interface BrandProfileContext {
  brandName: string;
  niche?: string | null;
  audience?: string | null;
  language?: string;
  tone?: string;
  descriptionStyle?: string | null;
  captionStyle?: string | null;
  defaultCTA?: string | null;
  defaultHashtags?: string[];
  forbiddenWords?: string[];
  preferredWords?: string[];
  emojiPolicy?: string;
}

export interface VideoAnalysisInput {
  transcript: string;
  filename: string;
  duration?: number;
  visualContext?: string;
}

export interface ContentGenerationInput {
  transcript: string;
  analysis: VideoAnalysisData;
  brandProfile?: BrandProfileContext | null;
  customInstructions?: string;
  model?: string;
}

export interface IAiProvider {
  name: string;
  isConfigured(): boolean;
  transcribeAudio(audioFilePath: string): Promise<string>;
  analyzeVideo(input: VideoAnalysisInput): Promise<VideoAnalysisData>;
  generateSocialContent(input: ContentGenerationInput): Promise<ContentJson>;
}
