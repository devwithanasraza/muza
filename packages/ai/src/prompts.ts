import { BrandProfileContext, ContentGenerationInput, VideoAnalysisInput } from './types.js';

export function buildAnalysisSystemPrompt(): string {
  return `You are a world-class AI video comprehension and multimodal content intelligence engine.
Your task is to analyze the video transcript, file context, and visual signals to extract deep semantic information.
Output must be strictly valid JSON conforming to this structure:
{
  "transcript": string,
  "detectedLanguage": string (e.g. "en", "es", "hi"),
  "topics": string[],
  "keywords": string[],
  "entities": string[],
  "summary": string (concise 2-4 sentences overview),
  "hook": string (the most captivating initial 3-5 second hook idea or spoken hook),
  "targetAudience": string (demographic and interest profile),
  "contentCategory": string (e.g. "Technology", "Education", "Entertainment"),
  "visualSummary": string (visual highlights),
  "duration": number (in seconds),
  "confidence": number (between 0.0 and 1.0)
}`;
}

export function buildAnalysisUserPrompt(input: VideoAnalysisInput): string {
  return `Please analyze the following video content:
Video Filename: "${input.filename}"
Duration: ${input.duration || 0} seconds
Visual Context: ${input.visualContext || 'Standard screen or camera recording'}
Full Audio Transcript:
"""
${input.transcript || '[No audio dialogue detected in file - derive from visual context & filename]'}
"""

Extract structured semantic insights and return JSON only.`;
}

export function buildContentGenerationSystemPrompt(brand?: BrandProfileContext | null): string {
  const brandSection = brand
    ? `
Brand Name: ${brand.brandName}
Niche: ${brand.niche || 'General'}
Target Audience: ${brand.audience || 'General public'}
Language: ${brand.language || 'English'}
Tone of Voice: ${brand.tone || 'Engaging & Authentic'}
Description Style: ${brand.descriptionStyle || 'Clear and informative'}
Caption Style: ${brand.captionStyle || 'Punchy, conversational, hook-driven'}
Default CTA: ${brand.defaultCTA || 'Subscribe and follow for more!'}
Default Hashtags: ${(brand.defaultHashtags || []).join(' ')}
Preferred Words: ${(brand.preferredWords || []).join(', ')}
Forbidden Words (DO NOT USE): ${(brand.forbiddenWords || []).join(', ')}
Emoji Policy: ${brand.emojiPolicy || 'STANDARD'}
`
    : 'Brand Profile: Default professional creator style.';

  return `You are an elite social media content strategist and copywriter specializing in high-performing YouTube videos and Instagram Reels.
You must generate tailored social metadata for both YouTube and Instagram based strictly on the provided video analysis.

${brandSection}

Rules:
1. YouTube Title: Must be under 100 characters. Highly click-worthy, engaging, accurate (no cheap clickbait).
2. YouTube Description: Comprehensive, includes video summary, key bullet points/chapters, and call to action. Max 5000 characters.
3. YouTube Tags: 10-25 high-search-intent tags.
4. Instagram Caption: Punchy opening hook line, value-packed body, question to boost comments, and clear call-to-action. Max 2200 chars.
5. Instagram Hashtags: 5-15 highly relevant hashtags categorized across primary topic, niche, and discovery. Each hashtag must start with '#' or be alphanumeric.
6. Strictly adhere to Forbidden Words and Tone guidelines.

Your output must be raw JSON conforming exactly to:
{
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": ["..."],
    "keywords": ["..."],
    "category": "22",
    "cta": "..."
  },
  "instagram": {
    "caption": "...",
    "hashtags": ["#tag1", "#tag2"],
    "cta": "...",
    "hook": "..."
  }
}`;
}

export function buildContentGenerationUserPrompt(input: ContentGenerationInput): string {
  return `Generate platform metadata based on this video analysis:
Summary: ${input.analysis.summary}
Hook: ${input.analysis.hook}
Topics: ${input.analysis.topics.join(', ')}
Keywords: ${input.analysis.keywords.join(', ')}
Detected Language: ${input.analysis.detectedLanguage}
Transcript Snippet:
"""
${input.transcript.slice(0, 3000)}
"""

${input.customInstructions ? `Additional User Instructions: ${input.customInstructions}` : ''}

Output strictly valid JSON.`;
}
