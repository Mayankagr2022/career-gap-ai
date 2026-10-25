import OpenAI from 'openai';
import { AiProvider, GenerateRequest, GenerateResult, splitSystem } from './ai-provider';

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;
  private readonly client?: OpenAI;

  /**
   * Any OpenAI-compatible endpoint (currently NVIDIA NIM), via the `openai` SDK.
   * baseURL is always explicit: the SDK would otherwise honour a legacy OPENAI_BASE_URL that points at Gemini.
   */
  constructor(
    name: string,
    apiKey: string | undefined,
    baseURL: string,
    readonly defaultModel: string,
    private readonly supportsJsonMode = true,
  ) {
    this.name = name;
    if (apiKey) this.client = new OpenAI({ apiKey, baseURL });
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  private buildMessages(req: GenerateRequest) {
    const { system, conversation } = splitSystem(req.messages);
    // json_object mode requires the word "json" in the prompt; agent prompts already include it
    return [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...conversation.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const model = req.model || this.defaultModel;
    const response = await this.client!.chat.completions.create({
      model,
      messages: this.buildMessages(req),
      max_completion_tokens: req.maxTokens,
      temperature: req.temperature,
      ...(req.json && this.supportsJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });
    return {
      text: response.choices[0]?.message?.content || '',
      model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    };
  }

  async stream(req: GenerateRequest, onChunk: (chunk: string) => void): Promise<void> {
    const stream = await this.client!.chat.completions.create({
      model: req.model || this.defaultModel,
      messages: this.buildMessages(req),
      max_completion_tokens: req.maxTokens,
      temperature: req.temperature,
      stream: true,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) onChunk(text);
    }
  }
}
