import { GoogleGenAI } from '@google/genai';
import { AiProvider, GenerateRequest, GenerateResult, splitSystem } from './ai-provider';

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly client?: GoogleGenAI;

  constructor(
    private readonly apiKey: string | undefined,
    readonly defaultModel: string,
  ) {
    if (apiKey) this.client = new GoogleGenAI({ apiKey });
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  private buildParams(req: GenerateRequest) {
    const { system, conversation } = splitSystem(req.messages);
    return {
      model: req.model || this.defaultModel,
      contents: conversation.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      config: {
        maxOutputTokens: req.maxTokens,
        temperature: req.temperature,
        systemInstruction: system ? { role: 'system', parts: [{ text: system }] } : undefined,
        responseMimeType: req.json ? 'application/json' : 'text/plain',
      },
    };
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const params = this.buildParams(req);
    const response = await this.client!.models.generateContent(params);
    return {
      text: response.text || '',
      model: params.model,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
  }

  async stream(req: GenerateRequest, onChunk: (chunk: string) => void): Promise<void> {
    const stream = await this.client!.models.generateContentStream(this.buildParams(req));
    for await (const chunk of stream) {
      if (chunk.text) onChunk(chunk.text);
    }
  }
}
