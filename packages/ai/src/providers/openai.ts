import OpenAI from 'openai';
import fs from 'fs';
import { jsonrepair } from 'jsonrepair';
import { ContentJson, ContentJsonSchema, VideoAnalysisData, VideoAnalysisSchema } from '@muza/shared';
import { ContentGenerationInput, IAiProvider, VideoAnalysisInput } from '../types.js';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  buildContentGenerationSystemPrompt,
  buildContentGenerationUserPrompt,
} from '../prompts.js';

export class OpenAiProvider implements IAiProvider {
  public name = 'openai';
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  public isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY && this.client);
  }

  private getClient(): OpenAI {
    if (!this.client || !process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI integration not configured. Missing OPENAI_API_KEY.');
    }
    return this.client;
  }

  public async transcribeAudio(audioFilePath: string): Promise<string> {
    const openai = this.getClient();
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found for transcription: ${audioFilePath}`);
    }

    const fileStream = fs.createReadStream(audioFilePath);
    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
    });

    return response.text || '';
  }

  public async analyzeVideo(input: VideoAnalysisInput): Promise<VideoAnalysisData> {
    const openai = this.getClient();
    const systemPrompt = buildAnalysisSystemPrompt();
    const userPrompt = buildAnalysisUserPrompt(input);

    const callApi = async () => {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      return response.choices[0]?.message?.content || '{}';
    };

    let rawJson = await callApi();
    let parsed: any;

    try {
      parsed = JSON.parse(rawJson);
    } catch {
      // Step 2: Attempt structured repair
      try {
        parsed = JSON.parse(jsonrepair(rawJson));
      } catch {
        // Step 1: Retry once
        rawJson = await callApi();
        parsed = JSON.parse(jsonrepair(rawJson));
      }
    }

    // Ensure transcript is preserved
    if (!parsed.transcript) {
      parsed.transcript = input.transcript;
    }

    return VideoAnalysisSchema.parse(parsed);
  }

  public async generateSocialContent(input: ContentGenerationInput): Promise<ContentJson> {
    const openai = this.getClient();
    const systemPrompt = buildContentGenerationSystemPrompt(input.brandProfile);
    const userPrompt = buildContentGenerationUserPrompt(input);

    const callApi = async () => {
      const response = await openai.chat.completions.create({
        model: input.model || process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '{}';
    };

    let rawJson = await callApi();
    let parsed: any;

    try {
      parsed = JSON.parse(rawJson);
    } catch {
      try {
        parsed = JSON.parse(jsonrepair(rawJson));
      } catch {
        // Retry once on failure
        rawJson = await callApi();
        parsed = JSON.parse(jsonrepair(rawJson));
      }
    }

    // Validate using Zod
    const validationResult = ContentJsonSchema.safeParse(parsed);
    if (!validationResult.success) {
      // Attempt structural normalization
      try {
        const repaired = jsonrepair(rawJson);
        const reparsed = JSON.parse(repaired);
        return ContentJsonSchema.parse(reparsed);
      } catch (err) {
        throw new Error(`AI generated content failed Zod validation: ${validationResult.error.message}`);
      }
    }

    return validationResult.data;
  }
}
