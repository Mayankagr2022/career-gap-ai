export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens: number;
  temperature: number;
  json: boolean;
}

export interface GenerateResult {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  stream(req: GenerateRequest, onChunk: (chunk: string) => void): Promise<void>;
}

export function splitSystem(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const conversation = messages.filter((m) => m.role !== 'system');
  const last = conversation[conversation.length - 1];
  if (!last || last.role !== 'user') {
    throw new Error('Last message must be from user');
  }
  return { system, conversation };
}
