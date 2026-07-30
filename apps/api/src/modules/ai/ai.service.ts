import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

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

  constructor(private readonly config: ConfigService) {
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

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
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

    const response = await this.genai.models.generateContent({
      model: options?.model || this.model,
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

    return response.text || '';
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
