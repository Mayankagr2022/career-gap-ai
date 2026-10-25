import { registerAs } from '@nestjs/config';

const isGeminiName = (value?: string) => !!value && value.toLowerCase().startsWith('gemini');

/**
 * Legacy deployments stored the Gemini key/model in OPENAI_API_KEY / OPENAI_MODEL; keep honouring that for Gemini.
 * A value starting with "sk-" is a real OpenAI key (unused) and is ignored.
 */
const legacyOpenAiKey = process.env.OPENAI_API_KEY;
const openAiKeyIsGemini = !!legacyOpenAiKey && !legacyOpenAiKey.startsWith('sk-');

export const aiConfig = registerAs('ai', () => ({
  providerOrder: (process.env.AI_PROVIDER_ORDER || 'nvidia,gemini')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean),
  embeddingProviderOrder: (process.env.AI_EMBEDDING_PROVIDER_ORDER || 'nvidia,gemini')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean),
  quotaCooldownMs: parseInt(process.env.AI_QUOTA_COOLDOWN_MS || '600000', 10),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS || '16000', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || process.env.OPENAI_TEMPERATURE || '0.3'),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || (openAiKeyIsGemini ? legacyOpenAiKey : undefined),
    model:
      process.env.GEMINI_MODEL ||
      (isGeminiName(process.env.OPENAI_MODEL) ? process.env.OPENAI_MODEL : undefined) ||
      'gemini-2.5-flash',
    embeddingModel:
      process.env.GEMINI_EMBEDDING_MODEL ||
      (isGeminiName(process.env.OPENAI_EMBEDDING_MODEL) ? process.env.OPENAI_EMBEDDING_MODEL : undefined) ||
      'gemini-embedding-001',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY,
    model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
    // Must return 768 dims (vector(768) columns); nemotron-3.5-embed-1b supports dimensions=768
    embeddingModel: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nemotron-3.5-embed-1b',
    baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    // json_object response_format is not supported by every NIM model; the prompts and JSON parser cope without it
    jsonMode: process.env.NVIDIA_JSON_MODE === 'true',
  },
}));
