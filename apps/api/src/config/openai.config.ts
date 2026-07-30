import { registerAs } from '@nestjs/config';

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  baseUrl: process.env.OPENAI_BASE_URL,
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
}));
