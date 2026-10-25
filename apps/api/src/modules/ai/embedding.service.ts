import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../common/prisma/prisma.service';

export const EMBEDDING_DIMENSIONS = 768;

@Injectable()
export class EmbeddingService {
  private readonly genai: GoogleGenAI;
  private readonly embeddingModel: string;
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.genai = new GoogleGenAI({ 
      apiKey: config.get('openai.apiKey'), // reuse the api key
    });
    this.embeddingModel = config.get('openai.embeddingModel', 'gemini-embedding-001');
    // this.embeddingModel = config.get('openai.embeddingModel', 'text-embedding-004');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.genai.models.embedContent({
      model: this.embeddingModel,
      contents: text.substring(0, 8000), // Token limit safety
      // Must match the vector(768) columns (and stay under pgvector's 2000-dim HNSW limit)
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });
    if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
      return [];
    }
    return response.embeddings[0].values;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // We map over each chunk independently to avoid SDK array batching bugs
    return Promise.all(
      texts.map(async (text) => this.generateEmbedding(text))
    );
  }

  async storeResumeEmbedding(resumeId: string, text: string): Promise<void> {
    // Split text into chunks of ~500 tokens each
    const chunks = this.chunkText(text, 2000);
    const embeddings = await this.generateEmbeddings(chunks);

    // Delete existing embeddings
    await this.prisma.resumeEmbedding.deleteMany({ where: { resumeId } });

    // Store new embeddings using raw SQL for vector type
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO resume_embeddings (id, "resumeId", content, embedding, "chunkIndex", "createdAt")
        VALUES (gen_random_uuid(), ${resumeId}::uuid, ${chunks[i]}, ${vectorStr}::vector, ${i}, NOW())
      `;
    }

    this.logger.log(`Stored ${chunks.length} embeddings for resume ${resumeId}`);
  }

  async storeJobEmbedding(jobId: string, text: string): Promise<void> {
    const chunks = this.chunkText(text, 2000);
    const embeddings = await this.generateEmbeddings(chunks);

    await this.prisma.jobEmbedding.deleteMany({ where: { jobId } });

    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(',')}]`;
      await this.prisma.$executeRaw`
        INSERT INTO job_embeddings (id, "jobId", content, embedding, "chunkIndex", "createdAt")
        VALUES (gen_random_uuid(), ${jobId}::uuid, ${chunks[i]}, ${vectorStr}::vector, ${i}, NOW())
      `;
    }
  }

  async findSimilarResumes(
    queryText: string,
    userId: string,
    limit: number = 5,
  ): Promise<Array<{ resumeId: string; similarity: number; content: string }>> {
    const embedding = await this.generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    const results = await this.prisma.$queryRaw<
      Array<{ resumeId: string; similarity: number; content: string }>
    >`
      SELECT re."resumeId"::text as "resumeId", 
             1 - (re.embedding <=> ${vectorStr}::vector) as similarity,
             re.content
      FROM resume_embeddings re
      JOIN resumes r ON r.id = re."resumeId"
      WHERE r."userId" = ${userId}::uuid
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
    const embedding = await this.generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    const results = await this.prisma.$queryRaw<
      Array<{ jobId: string; similarity: number; content: string }>
    >`
      SELECT je."jobId"::text as "jobId",
             1 - (je.embedding <=> ${vectorStr}::vector) as similarity,
             je.content
      FROM job_embeddings je
      JOIN jobs j ON j.id = je."jobId"
      WHERE j."userId" = ${userId}::uuid
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
