import { EmbeddingService, EMBEDDING_DIMENSIONS } from './embedding.service';

const vec = (n: number) => Array.from({ length: n }, () => 0.1);

function makeService(order: string[], opts: { nvidiaKey?: string; geminiKey?: string } = {}, prisma: any = {}) {
  const values: Record<string, any> = {
    'ai.embeddingProviderOrder': order,
    'ai.nvidia.apiKey': 'nvidiaKey' in opts ? opts.nvidiaKey : 'nvapi-test',
    'ai.gemini.apiKey': 'geminiKey' in opts ? opts.geminiKey : undefined,
  };
  const config = { get: (k: string, d?: any) => values[k] ?? d } as any;
  return new EmbeddingService(config, prisma);
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

  describe('embedding model tagging', () => {
    const sqlOf = (call: any[]) => (call[0] as string[]).join('?');

    it('stores the model that produced the vectors with every row', async () => {
      global.fetch = jest.fn().mockResolvedValue(okResponse(EMBEDDING_DIMENSIONS)) as any;
      const prisma = { resumeEmbedding: { deleteMany: jest.fn() }, $executeRaw: jest.fn().mockResolvedValue(1) };
      await makeService(['nvidia'], {}, prisma).storeResumeEmbedding('11111111-1111-1111-1111-111111111111', 'Node.js developer. '.repeat(10));

      const call = prisma.$executeRaw.mock.calls[0];
      expect(sqlOf(call)).toContain('"embeddingModel"');
      expect(call.slice(1)).toContain('nvidia/nemotron-3.5-embed-1b');
    });

    it('reports the fallback model when the first provider failed', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'down' }) as any;
      const service = makeService(['nvidia', 'gemini'], { geminiKey: 'g-key' });
      (service as any).embedGemini = jest.fn().mockResolvedValue(Array(EMBEDDING_DIMENSIONS).fill(0.2));

      const { model } = await service.embed(['text']);
      expect(model).toBe('gemini-embedding-001');
    });

    it('searches only vectors made by the same model as the query', async () => {
      global.fetch = jest.fn().mockResolvedValue(okResponse(EMBEDDING_DIMENSIONS)) as any;
      const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
      const service = makeService(['nvidia'], {}, prisma);

      await service.findSimilarResumes('node developer', 'user-1');
      await service.findSimilarJobs('node developer', 'user-1');

      for (const call of prisma.$queryRaw.mock.calls) {
        expect(sqlOf(call)).toContain('"embeddingModel" =');
        expect(call.slice(1)).toContain('nvidia/nemotron-3.5-embed-1b');
      }
    });
  });
});
