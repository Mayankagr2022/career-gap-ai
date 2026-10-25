import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ResumeParserService } from './resume-parser.service';
import { ResumeParserAgent } from '../ai/agents/resume-parser.agent';
import { EmbeddingService } from '../ai/embedding.service';
import { ResumeStatus } from '@prisma/client';
import { SkillsService } from '../skills/skills.service';
import { publicErrorMessage } from '../../common/utils/public-error';

@Processor('resume-processing')
export class ResumeProcessor {
  private readonly logger = new Logger(ResumeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly parserService: ResumeParserService,
    private readonly resumeParserAgent: ResumeParserAgent,
    private readonly embeddingService: EmbeddingService,
    private readonly skillsService: SkillsService,
  ) {}

  @Process('process-resume')
  async handleResumeProcessing(job: Job<{ resumeId: string; userId: string }>) {
    const { resumeId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing resume: ${resumeId}`);

    try {
      // 1. Get resume from DB; if the user deleted it while queued there is nothing to do (and no point retrying)
      const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
      if (!resume) {
        this.logger.warn(`Resume ${resumeId} no longer exists, skipping`);
        return;
      }

      // 2. Update status to PROCESSING
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { status: ResumeStatus.PROCESSING },
      });

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

      // 8. Update resume with parsed data and link its skills to the catalog
      const catalog = await this.skillsService.resolveMany(parsedData.skills ?? []);
      await this.prisma.$transaction([
        this.prisma.resumeSkill.deleteMany({ where: { resumeId } }),
        this.prisma.resumeSkill.createMany({
          data: [...catalog.values()].map((skill) => ({ resumeId, skillId: skill.id })),
          skipDuplicates: true,
        }),
        this.prisma.resume.update({
          where: { id: resumeId },
          data: {
            status: ResumeStatus.ANALYZED,
            parsedData: parsedData as any,
            rawText,
            atsScore,
            errorMessage: null,
          },
        }),
      ]);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Resume ${resumeId} processed in ${processingTime}ms`);
    } catch (error: any) {
      this.logger.error(`Failed to process resume ${resumeId}: ${error.message || String(error)}`, error.stack);

      // Only the final attempt marks the resume FAILED; earlier attempts let the queue retry
      if (job.attemptsMade + 1 < (job.opts.attempts ?? 1)) {
        throw error;
      }

      // updateMany: a resume deleted mid-processing must not turn this into a second failure
      await this.prisma.resume.updateMany({
        where: { id: resumeId },
        data: { status: ResumeStatus.FAILED, errorMessage: publicErrorMessage(error) },
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
