import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AiService {
  private readonly genai: GoogleGenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.genai = new GoogleGenAI({
      apiKey: config.get('openai.apiKey'), // reuse the api key
    });
    this.model = config.get('openai.model', 'gemini-2.5-flash');
    this.maxTokens = parseInt(config.get('openai.maxTokens', '100000'), 10) || 100000;
    this.temperature = config.get('openai.temperature', 0.3);
  }

  private mapMessagesToGeminiFormat(messages: ChatMessage[]) {
    return messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));
  }

  private prepareGeminiPayload(messages: ChatMessage[]) {
    const geminiMessages = this.mapMessagesToGeminiFormat(messages);
    const systemInstruction = geminiMessages.filter((m) => m.role === 'system').map(m => m.parts[0].text).join('\n');
    const conversation = geminiMessages.filter((m) => m.role !== 'system');
    
    // the last message must be from the user
    const lastMessage = conversation.pop();
    
    if (!lastMessage || lastMessage.role !== 'user') {
       throw new Error('Last message must be from user');
    }

    return { systemInstruction, conversation, lastMessage };
  }

  /** True when the provider says the quota is exhausted for a long window (e.g. free-tier daily cap), so retrying is pointless. */
  private isQuotaExhausted(error: any): boolean {
    const msg = String(error?.message ?? '');
    const status = error?.status || error?.response?.status || (msg.includes('"code":429') ? 429 : undefined);
    if (status !== 429) return false;
    const delay = msg.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
    return /PerDay|per day|RESOURCE_EXHAUSTED/i.test(msg) && (!delay || Number(delay[1]) > 60);
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (this.isQuotaExhausted(error)) {
          this.logger.error('AI provider quota exhausted; not retrying');
          throw new HttpException(
            'The AI service has reached its usage limit. Please try again later.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        const status = error?.status || error?.response?.status;
        const isRetryable = status === 503 || status === 429 || error?.message?.includes('503') || error?.message?.includes('429') || error?.message?.includes('JSON');
        
        if (isRetryable && attempt < maxRetries) {
          // const delayMs = attempt * 2000 + Math.random() * 1000; // Exponential backoff with jitter
          const delayMs = Math.pow(2, attempt) * 5000 + Math.random() * 2000;
          this.logger.warn(`AI API error (${status || 'Unknown'}). Retrying in ${Math.round(delayMs)}ms... (Attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Unreachable');
  }

  private async _chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      responseFormat?: 'json' | 'text';
    },
  ): Promise<string> {
    const { systemInstruction, conversation, lastMessage } = this.prepareGeminiPayload(messages);
    const model = options?.model || this.model;
    const startedAt = Date.now();

    let response;
    try {
      response = await this.generate(model, conversation, lastMessage, systemInstruction, options);
    } catch (error: any) {
      this.recordUsage({ model, latencyMs: Date.now() - startedAt, success: false, error: error?.message });
      throw error;
    }

    this.recordUsage({
      model,
      latencyMs: Date.now() - startedAt,
      success: true,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    });

    return response.text || '';
  }

  private generate(
    model: string,
    conversation: any[],
    lastMessage: any,
    systemInstruction: string,
    options?: { maxTokens?: number; temperature?: number; responseFormat?: 'json' | 'text' },
  ) {
    return this.genai.models.generateContent({
      model,
      contents: [
        ...conversation,
        lastMessage
      ],
      config: {
        maxOutputTokens: options?.maxTokens || this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
        systemInstruction: systemInstruction ? {
           role: 'system',
           parts: [{ text: systemInstruction }]
        } : undefined,
        responseMimeType: options?.responseFormat === 'json' ? 'application/json' : 'text/plain',
      },
    });
  }

  /** Fire-and-forget: usage logging must never slow down or fail an AI call. */
  private recordUsage(entry: {
    model: string;
    latencyMs: number;
    success: boolean;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
  }) {
    this.prisma.aiUsageLog
      .create({ data: { ...entry, error: entry.error?.slice(0, 500) } })
      .catch((err) => this.logger.warn(`AI usage log failed: ${err.message}`));
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      responseFormat?: 'json' | 'text';
    },
  ): Promise<string> {
    return this.withRetry(() => this._chat(messages, options));
  }

  async chatWithJson<T>(
    messages: ChatMessage[],
    options?: { model?: string; maxTokens?: number; temperature?: number },
  ): Promise<T> {
    return this.withRetry(async () => {
      const content = await this._chat(messages, { ...options, responseFormat: 'json' });
      
      // Robust JSON extraction matching markdown blocks
      let cleanedContent = content.trim();
      const match = cleanedContent.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
      if (match) {
        cleanedContent = match[1].trim();
      }

      try {
        return JSON.parse(cleanedContent) as T;
      } catch (error: any) {
        const length = cleanedContent.length;
        const endSnippet = length > 500 ? '...' + cleanedContent.substring(length - 500) : cleanedContent;
        this.logger.error(`Failed to parse JSON (Length: ${length}). Error: ${error.message}. End of content: ${endSnippet}`);
        
        // Throwing here triggers the retry mechanism in withRetry
        throw new Error('AI returned invalid JSON response', { cause: error });
      }
    }, 3);
  }

  async stream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const { systemInstruction, conversation, lastMessage } = this.prepareGeminiPayload(messages);

    const stream = await this.withRetry(() => this.genai.models.generateContentStream({
      model: this.model,
      contents: [
        ...conversation,
        lastMessage
      ],
      config: {
         temperature: this.temperature,
         systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }]} : undefined,
      }
    }));

    for await (const chunk of stream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  }

  getClient(): GoogleGenAI {
    return this.genai;
  }
}
