import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GapAnalysisAgent } from '../ai/agents/gap-analysis.agent';
import { RecommendationAgent } from '../ai/agents/recommendation.agent';
import { RoadmapAgent } from '../ai/agents/roadmap.agent';
import { AnalysisStatus, RecommendationType, DifficultyLevel, NotificationType } from '@prisma/client';

@Processor('analysis-processing')
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gapAnalysisAgent: GapAnalysisAgent,
    private readonly recommendationAgent: RecommendationAgent,
    private readonly roadmapAgent: RoadmapAgent,
  ) {}

  @Process('process-analysis')
  async handleAnalysis(job: Job<{ analysisId: string }>) {
    const { analysisId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing analysis: ${analysisId}`);

    try {
      // 1. Set status to PROCESSING
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.PROCESSING },
      });

      // 2. Load analysis with related data
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
        include: {
          resume: { select: { parsedData: true, rawText: true } },
          job: true,
        },
      });

      if (!analysis || !analysis.resume.parsedData) {
        throw new Error('Analysis or parsed resume data not found');
      }

      const parsedResume = analysis.resume.parsedData as any;
      const job_data = analysis.job;

      // Reconstruct ParsedJob from stored job data
      const parsedJob = {
        title: job_data.title,
        company: job_data.company,
        location: job_data.location || undefined,
        remote: job_data.remote,
        requiredSkills: job_data.requiredSkills,
        preferredSkills: job_data.preferredSkills,
        responsibilities: [],
        qualifications: [],
        experienceLevel: job_data.experienceLevel || undefined,
        education: job_data.education || undefined,
        jobType: job_data.jobType || undefined,
        industry: job_data.industry || undefined,
        keyKeywords: [...job_data.requiredSkills, ...job_data.preferredSkills],
      } as any;

      // 3. Run gap analysis
      const gapResult = await this.gapAnalysisAgent.analyze(
        parsedResume,
        parsedJob,
        job_data.description,
      );

      // 4. Generate recommendations
      const recommendations = await this.recommendationAgent.generate(
        parsedResume,
        parsedJob,
        gapResult,
      );

      // 5. Generate roadmap
      const roadmap = await this.roadmapAgent.generate(
        parsedResume,
        parsedJob,
        gapResult,
        recommendations,
      );

      const processingTime = Date.now() - startTime;

      // 6. Save all results in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Update analysis
        await tx.analysis.update({
          where: { id: analysisId },
          data: {
            status: AnalysisStatus.COMPLETED,
            matchScore: gapResult.matchScore,
            atsScore: gapResult.atsScore,
            skillGaps: gapResult.skillGaps as any,
            strengths: gapResult.strengths,
            weaknesses: gapResult.weaknesses,
            recommendations: gapResult.recommendations,
            atsSuggestions: gapResult.atsSuggestions as any,
            rawAnalysis: { ...gapResult, executiveSummary: gapResult.executiveSummary } as any,
            processingTime,
          },
        });

        // Save recommendations
        await tx.recommendation.createMany({
          data: recommendations.map((r, index) => ({
            userId: analysis.userId,
            analysisId,
            type: r.type as RecommendationType,
            title: r.title,
            description: r.description,
            url: r.url,
            duration: r.duration,
            difficulty: (r.difficulty || 'INTERMEDIATE') as DifficultyLevel,
            priority: r.priority || index,
            skills: r.skills,
            provider: r.provider,
            cost: r.cost,
          })),
        });

        // Save roadmap
        await tx.roadmap.create({
          data: {
            userId: analysis.userId,
            analysisId,
            title: roadmap.title,
            targetRole: roadmap.targetRole,
            milestones: roadmap.milestones as any,
          },
        });

        // Create notification
        await tx.notification.create({
          data: {
            userId: analysis.userId,
            title: 'Analysis Completed',
            message: `Your resume analysis for ${job_data.title || 'the job'} is ready!`,
            type: NotificationType.SUCCESS,
            link: `/dashboard/analyses/${analysisId}`,
          },
        });
      });

      this.logger.log(`Analysis ${analysisId} completed in ${processingTime}ms`);
    } catch (error) {
      this.logger.error(`Analysis ${analysisId} failed: ${error.message}`);

      // Create failure notification
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
        select: { userId: true },
      });

      if (analysis) {
        await this.prisma.notification.create({
          data: {
            userId: analysis.userId,
            title: 'Analysis Failed',
            message: 'There was an error processing your resume analysis. Please try again.',
            type: NotificationType.ERROR,
          },
        });
      }

      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.FAILED },
      });

      throw error;
    }
  }
}
