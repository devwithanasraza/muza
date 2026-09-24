import { ContentJson, VideoAnalysisData } from '@muza/shared';
import { ContentGenerationInput, IAiProvider, VideoAnalysisInput } from './types.js';
import { OpenAiProvider } from './providers/openai.js';

export class AiService {
  private providers: Map<string, IAiProvider> = new Map();
  private defaultProviderName = 'openai';

  constructor() {
    this.registerProvider(new OpenAiProvider());
  }

  public registerProvider(provider: IAiProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name?: string): IAiProvider {
    const providerName = name || this.defaultProviderName;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI Provider "${providerName}" is not registered.`);
    }
    return provider;
  }

  public isConfigured(providerName?: string): boolean {
    try {
      const provider = this.getProvider(providerName);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  public async transcribeAudio(audioFilePath: string, providerName?: string): Promise<string> {
    const provider = this.getProvider(providerName);
    return provider.transcribeAudio(audioFilePath);
  }

  public async analyzeVideo(input: VideoAnalysisInput, providerName?: string): Promise<VideoAnalysisData> {
    const provider = this.getProvider(providerName);
    return provider.analyzeVideo(input);
  }

  public async generateSocialContent(input: ContentGenerationInput, providerName?: string): Promise<ContentJson> {
    const provider = this.getProvider(providerName);
    return provider.generateSocialContent(input);
  }
}

export const aiService = new AiService();
