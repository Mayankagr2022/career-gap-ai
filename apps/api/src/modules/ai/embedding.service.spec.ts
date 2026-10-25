import { EmbeddingService, EMBEDDING_DIMENSIONS } from './embedding.service';

const vec = (n: number) => Array.from({ length: n }, () => 0.1);

function makeService(order: string[], opts: { nvidiaKey?: string; geminiKey?: string } = {}) {
  const values: Record<string, any> = {
    'ai.embeddingProviderOrder': order,
    'ai.nvidia.apiKey': 'nvidiaKey' in opts ? opts.nvidiaKey : 'nvapi-test',
    'ai.gemini.apiKey': 'geminiKey' in opts ? opts.geminiKey : undefined,
  };
  const config = { get: (k: string, d?: any) => values[k] ?? d } as any;
  return new EmbeddingService(config, {} as any);
}

const okResponse = (dims: number) => ({ ok: true, json: async () => ({ data: [{ embedding: vec(dims) }] }) });

describe('EmbeddingService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('uses NVIDIA first and requests 768 dimensions', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(EMBEDDING_DIMENSIONS));
    global.fetch = fetchMock as any;
    const out = await makeService(['nvidia', 'gemini']).generateEmbeddings(['a', 'b']);
    expect(out).toHaveLength(2);
    expect(out[0]).toHaveLength(EMBEDDING_DIMENSIONS);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.dimensions).toBe(EMBEDDING_DIMENSIONS);
    expect(body.input_type).toBe('passage');
  });

  it('uses input_type "query" for query embeddings', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(EMBEDDING_DIMENSIONS));
    global.fetch = fetchMock as any;
    await makeService(['nvidia']).generateEmbedding('find jobs', 'query');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input_type).toBe('query');
  });

  it('rejects vectors with the wrong dimension count', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(4096)) as any;
    await expect(makeService(['nvidia']).generateEmbeddings(['a'])).rejects.toThrow('expected 768');
  });

  it('throws the NVIDIA error when it fails and no other provider is configured', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'bad key' }) as any;
    await expect(makeService(['nvidia', 'gemini']).generateEmbeddings(['a'])).rejects.toThrow('NVIDIA embeddings 401');
  });

  it('skips providers without a key', async () => {
    await expect(makeService(['nvidia', 'gemini'], { nvidiaKey: undefined }).generateEmbeddings(['a'])).rejects.toThrow(
      'No embedding provider is configured',
    );
  });
});
