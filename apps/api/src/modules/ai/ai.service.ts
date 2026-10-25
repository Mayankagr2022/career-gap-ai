import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiProvider, ChatMessage, GenerateRequest } from './providers/ai-provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

export type { ChatMessage } from './providers/ai-provider';

interface CallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
}

/**
 * quota/auth: this provider is unusable for a while, skip it and try the next.
 * transient: worth retrying on the same provider, then fail over.
 * fatal: the request itself is bad (or partially streamed); another provider will not help.
 */
type ErrorKind = 'quota' | 'auth' | 'transient' | 'fatal';

const QUOTA_MESSAGE = /PerDay|per day|RESOURCE_EXHAUSTED|insufficient_quota|exceeded your current quota|credit balance/i;

@Injectable()
export class AiService {
  readonly logger = new Logger(AiService.name);
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly cooldownMs: number;
  /** Provider name -> epoch ms until which it is skipped. */
  private readonly cooldowns = new Map<string, number>();
  /** Ordered by AI_PROVIDER_ORDER; unconfigured providers are dropped. */
  providers: AiProvider[];

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.maxTokens = config.get('ai.maxTokens', 16000);
    this.temperature = config.get('ai.temperature', 0.3);
    this.cooldownMs = config.get('ai.quotaCooldownMs', 600000);

    const all: Record<string, AiProvider> = {
      gemini: new GeminiProvider(config.get('ai.gemini.apiKey'), config.get('ai.gemini.model', 'gemini-2.5-flash')),
      nvidia: new OpenAiCompatibleProvider(
        'nvidia',
        config.get('ai.nvidia.apiKey'),
        config.get('ai.nvidia.baseUrl', 'https://integrate.api.nvidia.com/v1'),
        config.get('ai.nvidia.model', 'nvidia/nemotron-3-ultra-550b-a55b'),
        config.get('ai.nvidia.jsonMode', false),
      ),
    };
    const order: string[] = config.get('ai.providerOrder', ['nvidia', 'gemini']);
    this.providers = order.map((n) => all[n]).filter((p): p is AiProvider => !!p && p.isConfigured());
    this.logger.log(`AI providers (in order): ${this.providers.map((p) => `${p.name}:${p.defaultModel}`).join(', ') || 'none'}`);
  }

  private errorStatus(error: any): number | undefined {
    const msg = String(error?.message ?? '');
    return error?.status || error?.response?.status || (msg.includes('"code":429') ? 429 : undefined);
  }

  private classify(error: any): ErrorKind {
    if (error?.partialOutput) return 'fatal';
    const msg = String(error?.message ?? '');
    const status = this.errorStatus(error);

    if (status === 429) {
      const delay = msg.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
      const longWindow = QUOTA_MESSAGE.test(msg) && (!delay || Number(delay[1]) > 60);
      return longWindow ? 'quota' : 'transient';
    }
    if (status === 401 || status === 402 || status === 403) return 'auth';
    // Gemini reports an invalid key as 400 INVALID_ARGUMENT
    if (status === 400 && /API_KEY_INVALID|API key not valid|valid API key/i.test(msg)) return 'auth';
    // A wrong model name / missing access on one provider should not take the others down
    // 410: model retired
    if (status === 404 || status === 410) return 'auth';
    if (status && status >= 500) return 'transient';
    if (status && status >= 400) return 'fatal';
    // No HTTP status: network errors, "overloaded", JSON parse failures
    return 'transient';
  }

  private isCoolingDown(p: AiProvider): boolean {
    const until = this.cooldowns.get(p.name);
    if (until === undefined) return false;
    if (until <= Date.now()) {
      this.cooldowns.delete(p.name);
      return false;
    }
    return true;
  }

  private async retryOnProvider<T>(operation: () => Promise<T>, maxAttempts: number, fast: boolean): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (this.classify(error) !== 'transient' || attempt >= maxAttempts) throw error;
        // With another provider waiting, fail over quickly instead of backing off for 10-20s
        const delayMs = fast ? attempt * 1000 : Math.pow(2, attempt) * 5000 + Math.random() * 2000;
        this.logger.warn(`AI API error (${this.errorStatus(error) || 'Unknown'}). Retrying in ${Math.round(delayMs)}ms... (Attempt ${attempt}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /** Runs `operation` on each provider in order until one succeeds. */
  private async withFailover<T>(operation: (provider: AiProvider) => Promise<T>): Promise<T> {
    if (this.providers.length === 0) {
      throw new HttpException('No AI provider is configured.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    let candidates = this.providers.filter((p) => !this.isCoolingDown(p));
    if (candidates.length === 0) candidates = this.providers; // everything cooling down: try anyway

    let lastError: any;
    let sawQuota = false;
    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const hasNext = i < candidates.length - 1;
      try {
        return await this.retryOnProvider(() => operation(provider), hasNext ? 2 : 3, hasNext);
      } catch (error: any) {
        lastError = error;
        const kind = this.classify(error);
        if (kind === 'fatal') throw error;
        if (kind === 'quota' || kind === 'auth') {
          sawQuota = sawQuota || kind === 'quota';
          this.cooldowns.set(provider.name, Date.now() + this.cooldownMs);
          this.logger.error(`AI provider "${provider.name}" unavailable (${kind}): ${String(error?.message).slice(0, 200)}`);
        } else {
          this.logger.warn(`AI provider "${provider.name}" failed: ${String(error?.message).slice(0, 200)}`);
        }
        if (hasNext) this.logger.warn(`Falling back to "${candidates[i + 1].name}"`);
      }
    }

    if (sawQuota) {
      throw new HttpException(
        'The AI service has reached its usage limit. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    throw lastError;
  }

  private buildRequest(messages: ChatMessage[], provider: AiProvider, options?: CallOptions): GenerateRequest {
    return {
      messages,
      // A per-call model override targets the primary provider only
      model: provider === this.providers[0] ? options?.model : undefined,
      maxTokens: options?.maxTokens || this.maxTokens,
      temperature: options?.temperature ?? this.temperature,
      json: options?.responseFormat === 'json',
    };
  }

  private async attempt(provider: AiProvider, messages: ChatMessage[], options?: CallOptions): Promise<string> {
    const req = this.buildRequest(messages, provider, options);
    const startedAt = Date.now();
    try {
      const result = await provider.generate(req);
      this.recordUsage({
        model: result.model,
        latencyMs: Date.now() - startedAt,
        success: true,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
      return result.text;
    } catch (error: any) {
      this.recordUsage({
        model: req.model || provider.defaultModel,
        latencyMs: Date.now() - startedAt,
        success: false,
        error: error?.message,
      });
      throw error;
    }
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

  async chat(messages: ChatMessage[], options?: CallOptions): Promise<string> {
    return this.withFailover((p) => this.attempt(p, messages, options));
  }

  async chatWithJson<T>(
    messages: ChatMessage[],
    options?: { model?: string; maxTokens?: number; temperature?: number },
  ): Promise<T> {
    return this.withFailover(async (provider) => {
      const content = await this.attempt(provider, messages, { ...options, responseFormat: 'json' });

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
        this.logger.error(`Failed to parse JSON from ${provider.name} (Length: ${length}). Error: ${error.message}. End of content: ${endSnippet}`);

        // Classified as transient: retried on this provider, then fails over
        throw new Error('AI returned invalid JSON response', { cause: error });
      }
    });
  }

  async stream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
    await this.withFailover(async (provider) => {
      let emitted = false;
      try {
        await provider.stream(this.buildRequest(messages, provider), (chunk) => {
          emitted = true;
          onChunk(chunk);
        });
      } catch (error: any) {
        // Once the caller has received text, switching providers would duplicate/garble output
        if (emitted) error.partialOutput = true;
        throw error;
      }
    });
  }
}
