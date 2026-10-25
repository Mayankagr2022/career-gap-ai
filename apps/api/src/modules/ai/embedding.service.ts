import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../common/prisma/prisma.service';

export const EMBEDDING_DIMENSIONS = 768;

type EmbeddingProviderName = 'nvidia' | 'gemini';
/** NVIDIA retrieval models embed queries and passages differently. */
export type EmbeddingInputType = 'passage' | 'query';

@Injectable()
export class EmbeddingService {
  private readonly genai?: GoogleGenAI;
  private readonly geminiModel: string;
  private readonly nvidiaKey?: string;
  private readonly nvidiaBaseUrl: string;
  private readonly nvidiaModel: string;
  private readonly order: EmbeddingProviderName[];
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const geminiKey = config.get('ai.gemini.apiKey');
    if (geminiKey) this.genai = new GoogleGenAI({ apiKey: geminiKey });
    this.geminiModel = config.get('ai.gemini.embeddingModel', 'gemini-embedding-001');
    this.nvidiaKey = config.get('ai.nvidia.apiKey');
    this.nvidiaBaseUrl = config.get('ai.nvidia.baseUrl', 'https://integrate.api.nvidia.com/v1');
    this.nvidiaModel = config.get('ai.nvidia.embeddingModel', 'nvidia/nemotron-3.5-embed-1b');

    const configured: Record<EmbeddingProviderName, boolean> = { nvidia: !!this.nvidiaKey, gemini: !!this.genai };
    const order: string[] = config.get('ai.embeddingProviderOrder', ['nvidia', 'gemini']);
    this.order = order.filter((n): n is EmbeddingProviderName => configured[n as EmbeddingProviderName]);
    this.logger.log(`Embedding providers (in order): ${this.order.join(', ') || 'none'}`);
  }

  async generateEmbedding(text: string, inputType: EmbeddingInputType = 'passage'): Promise<number[]> {
    return (await this.generateEmbeddings([text], inputType))[0];
  }

  /**
   * All texts are embedded by the same provider so one document never mixes vector spaces.
   * Falls back to the next provider if any text fails.
   */
  async generateEmbeddings(texts: string[], inputType: EmbeddingInputType = 'passage'): Promise<number[][]> {
    return (await this.embed(texts, inputType)).vectors;
  }

  /**
   * Same as generateEmbeddings, but also reports which model produced the vectors. That is what gets stored with them:
   * vectors of different models are not comparable, so a search must only look at rows made by the query's model.
   */
  async embed(texts: string[], inputType: EmbeddingInputType = 'passage'): Promise<{ vectors: number[][]; model: string }> {
    if (this.order.length === 0) {
      throw new HttpException('No embedding provider is configured.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    let lastError: any;
    for (let i = 0; i < this.order.length; i++) {
      const provider = this.order[i];
      try {
        const vectors = await Promise.all(
          texts.map((t) => (provider === 'nvidia' ? this.embedNvidia(t, inputType) : this.embedGemini(t))),
        );
        for (const v of vectors) {
          if (v.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(`${provider} returned ${v.length}-dim embedding, expected ${EMBEDDING_DIMENSIONS}`);
          }
        }
        return { vectors, model: provider === 'nvidia' ? this.nvidiaModel : this.geminiModel };
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Embedding provider "${provider}" failed: ${String(error?.message).slice(0, 200)}`);
        if (i < this.order.length - 1) this.logger.warn(`Falling back to "${this.order[i + 1]}" for embeddings`);
      }
    }
    throw lastError;
  }

  private async embedNvidia(text: string, inputType: EmbeddingInputType): Promise<number[]> {
    const res = await fetch(`${this.nvidiaBaseUrl}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.nvidiaKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: this.nvidiaModel,
        input: [text.substring(0, 8000)], // Token limit safety
        input_type: inputType,
        encoding_format: 'float',
        truncate: 'END',
        // Must match the vector(768) columns (and stay under pgvector's 2000-dim HNSW limit)
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw Object.assign(new Error(`NVIDIA embeddings ${res.status}: ${body}`), { status: res.status });
    }
    const json: any = await res.json();
    return json?.data?.[0]?.embedding ?? [];
  }

  private async embedGemini(text: string, maxAttempts = 3): Promise<number[]> {
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.genai!.models.embedContent({
          model: this.geminiModel,
          contents: text.substring(0, 8000), // Token limit safety
          config: { outputDimensionality: EMBEDDING_DIMENSIONS },
        });
        return response.embeddings?.[0]?.values ?? [];
      } catch (error: any) {
        const status = error?.status;
        const msg = String(error?.message ?? '');
        if (status === 429 && /PerDay|per day|RESOURCE_EXHAUSTED/i.test(msg)) {
          this.logger.error('Gemini embedding quota exhausted; not retrying');
          throw new HttpException(
            'The AI service has reached its usage limit. Please try again later.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        if (!(status === 429 || (status >= 500 && status < 600)) || attempt >= maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000 + Math.random() * 1000));
      }
    }
  }

  async storeResumeEmbedding(resumeId: string, text: string): Promise<void> {
    // Split text into chunks of ~500 tokens each
    const chunks = this.chunkText(text, 2000);
    const { vectors: embeddings, model } = await this.embed(chunks);

    // Delete existing embeddings
    await this.prisma.resumeEmbedding.deleteMany({ where: { resumeId } });

    // Store new embeddings using raw SQL for vector type
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO resume_embeddings (id, "resumeId", content, embedding, "chunkIndex", "embeddingModel", "createdAt")
        VALUES (gen_random_uuid(), ${resumeId}::uuid, ${chunks[i]}, ${vectorStr}::vector, ${i}, ${model}, NOW())
      `;
    }

    this.logger.log(`Stored ${chunks.length} embeddings for resume ${resumeId}`);
  }

  async storeJobEmbedding(jobId: string, text: string): Promise<void> {
    const chunks = this.chunkText(text, 2000);
    const { vectors: embeddings, model } = await this.embed(chunks);

    await this.prisma.jobEmbedding.deleteMany({ where: { jobId } });

    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO job_embeddings (id, "jobId", content, embedding, "chunkIndex", "embeddingModel", "createdAt")
        VALUES (gen_random_uuid(), ${jobId}::uuid, ${chunks[i]}, ${vectorStr}::vector, ${i}, ${model}, NOW())
      `;
    }
  }

  async findSimilarResumes(
    queryText: string,
    userId: string,
    limit: number = 5,
  ): Promise<Array<{ resumeId: string; similarity: number; content: string }>> {
    const { vectors, model } = await this.embed([queryText], 'query');
    const vectorStr = `[${vectors[0].join(',')}]`;

    const results = await this.prisma.$queryRaw<
      Array<{ resumeId: string; similarity: number; content: string }>
    >`
      SELECT re."resumeId"::text as "resumeId", 
             1 - (re.embedding <=> ${vectorStr}::vector) as similarity,
             re.content
      FROM resume_embeddings re
      JOIN resumes r ON r.id = re."resumeId"
      WHERE r."userId" = ${userId}::uuid
        AND re."embeddingModel" = ${model}
      ORDER BY re.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      resumeId: r.resumeId,
      similarity: r.similarity,
      content: r.content,
    }));
  }

  async findSimilarJobs(
    queryText: string,
    userId: string,
    limit: number = 5,
  ): Promise<Array<{ jobId: string; similarity: number; content: string }>> {
    const { vectors, model } = await this.embed([queryText], 'query');
    const vectorStr = `[${vectors[0].join(',')}]`;

    const results = await this.prisma.$queryRaw<
      Array<{ jobId: string; similarity: number; content: string }>
    >`
      SELECT je."jobId"::text as "jobId",
             1 - (je.embedding <=> ${vectorStr}::vector) as similarity,
             je.content
      FROM job_embeddings je
      JOIN jobs j ON j.id = je."jobId"
      WHERE j."userId" = ${userId}::uuid
        AND je."embeddingModel" = ${model}
      ORDER BY je.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      jobId: r.jobId,
      similarity: r.similarity,
      content: r.content,
    }));
  }

  private chunkText(text: string, maxChunkSize: number, overlapSize: number = 200): string[] {
    const chunks: string[] = [];
    // Split by punctuation OR newlines to handle resume bullet points correctly
    const segments = text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    
    let currentChunk = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (currentChunk.length === 0) {
        currentChunk = segment;
        continue;
      }

      // If adding the next segment exceeds the limit
      if ((currentChunk + ' ' + segment).length > maxChunkSize) {
        chunks.push(currentChunk.trim());
        
        // Generate overlap: take the last ~overlapSize characters of the current chunk,
        // trying to snap to the nearest word boundary (space) so we don't cut words in half.
        let overlapText = currentChunk.substring(Math.max(0, currentChunk.length - overlapSize));
        const firstSpaceIndex = overlapText.indexOf(' ');
        if (firstSpaceIndex !== -1 && firstSpaceIndex < overlapText.length - 1) {
          overlapText = overlapText.substring(firstSpaceIndex + 1);
        }
        
        // Start the new chunk with the overlap + the new segment
        currentChunk = overlapText + (overlapText ? ' ' : '') + segment;
      } else {
        currentChunk += ' ' + segment;
      }
    }

    if (currentChunk.trim().length > 0) {
      // Only push the final chunk if it's meaningful (larger than just the overlap)
      if (chunks.length === 0 || currentChunk.length > overlapSize) {
        chunks.push(currentChunk.trim());
      }
    }

    return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
  }
}
