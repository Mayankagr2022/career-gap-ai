import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ResumeParserService } from './resume-parser.service';
import { ResumeParserAgent } from '../ai/agents/resume-parser.agent';
import { EmbeddingService } from '../ai/embedding.service';
import { ResumeStatus } from '@prisma/client';

@Processor('resume-processing')
export class ResumeProcessor {
  private readonly logger = new Logger(ResumeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly parserService: ResumeParserService,
    private readonly resumeParserAgent: ResumeParserAgent,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Process('process-resume')
  async handleResumeProcessing(job: Job<{ resumeId: string; userId: string }>) {
    const { resumeId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing resume: ${resumeId}`);

    try {
      // 1. Update status to PROCESSING
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { status: ResumeStatus.PROCESSING },
      });

      // 2. Get resume from DB
      const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
      if (!resume) throw new Error('Resume not found');

      // 3. Download from S3
      const buffer = await this.storage.getFileBuffer(resume.fileKey);

      // 4. Extract text
      const rawText = await this.parserService.extractText(buffer, resume.mimeType);

      // 5. Parse with AI
      const parsedData = await this.resumeParserAgent.parse(rawText);

      // 6. Generate embeddings for RAG
      await this.embeddingService.storeResumeEmbedding(resumeId, rawText);

      // 7. Calculate ATS score (basic heuristic - full analysis happens in analyses module)
      const atsScore = this.calculateBasicAtsScore(parsedData);

      // 8. Update resume with parsed data
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: ResumeStatus.ANALYZED,
          parsedData: parsedData as any,
          rawText,
          atsScore,
        },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`Resume ${resumeId} processed in ${processingTime}ms`);
    } catch (error: any) {
      this.logger.error(`Failed to process resume ${resumeId}: ${error.message || String(error)}`, error.stack);

      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { status: ResumeStatus.FAILED },
      });

      throw error;
    }
  }

  private calculateBasicAtsScore(parsed: any): number {
    let score = 0;

    // Has contact info
    if (parsed.email) score += 10;
    if (parsed.phone) score += 5;
    if (parsed.location) score += 5;

    // Has summary
    if (parsed.summary) score += 10;

    // Skills
    const skillCount = parsed.skills?.length || 0;
    score += Math.min(20, skillCount * 2);

    // Experience with achievements
    const expWithAchievements = (parsed.experience || []).filter(
      (e: any) => e.achievements?.length > 0,
    ).length;
    score += Math.min(20, expWithAchievements * 5);

    // Education
    if (parsed.education?.length > 0) score += 10;

    // Certifications
    if (parsed.certifications?.length > 0) score += 10;

    // Total experience
    if (parsed.totalYearsExperience > 0) score += 10;

    return Math.min(100, score);
  }
}
