import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GapAnalysisAgent } from '../ai/agents/gap-analysis.agent';
import { RecommendationAgent } from '../ai/agents/recommendation.agent';
import { RoadmapAgent } from '../ai/agents/roadmap.agent';
import {
  AnalysisStatus,
  AtsIssueType,
  DifficultyLevel,
  FitAssessment,
  GapImportance,
  IssueSeverity,
  JobSkillImportance,
  NotificationType,
  RecommendationType,
  SkillCategory,
} from '@prisma/client';
import { SkillsService, skillSlug } from '../skills/skills.service';
import { publicErrorMessage } from '../../common/utils/public-error';
import { buildKeywordSuggestions, computeAnalysisAts } from '../../common/scoring/ats-score';
import { NotificationsService } from '../notifications/notifications.service';

/** Coerce AI output to a valid enum value, falling back instead of failing the whole analysis. */
const asEnum = <T extends string>(values: Record<string, T>, value: unknown, fallback: T): T =>
  Object.values(values).includes(value as T) ? (value as T) : fallback;

@Processor('analysis-processing')
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gapAnalysisAgent: GapAnalysisAgent,
    private readonly recommendationAgent: RecommendationAgent,
    private readonly roadmapAgent: RoadmapAgent,
    private readonly skillsService: SkillsService,
    private readonly notifications: NotificationsService,
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
          job: { include: { skills: { include: { skill: { select: { name: true } } } } } },
        },
      });

      if (!analysis || !analysis.resume.parsedData) {
        throw new Error('Analysis or parsed resume data not found');
      }

      const parsedResume = analysis.resume.parsedData as any;
      const job_data = analysis.job;
      const requiredSkills = job_data.skills
        .filter((s) => s.importance === JobSkillImportance.REQUIRED)
        .map((s) => s.skill.name);
      const preferredSkills = job_data.skills
        .filter((s) => s.importance === JobSkillImportance.PREFERRED)
        .map((s) => s.skill.name);

      // Reconstruct ParsedJob from stored job data
      const parsedJob = {
        title: job_data.title,
        company: job_data.company,
        location: job_data.location || undefined,
        remote: job_data.remote,
        requiredSkills,
        preferredSkills,
        responsibilities: [],
        qualifications: [],
        experienceLevel: job_data.experienceLevel || undefined,
        education: job_data.education || undefined,
        jobType: job_data.jobType || undefined,
        industry: job_data.industry || undefined,
        keyKeywords: [...requiredSkills, ...preferredSkills],
      } as any;

      // 3. Run gap analysis
      const gapResult = await this.gapAnalysisAgent.analyze(
        parsedResume,
        parsedJob,
        job_data.description,
      );

      // ATS is computed from the resume and the job's skills, not guessed by the model. Keyword advice is
      // derived from the same calculation so the suggestions always agree with the score.
      const ats = computeAnalysisAts(parsedResume, analysis.resume.rawText, requiredSkills, preferredSkills);
      const atsSuggestions: Array<{ type: string; severity: string; message: string; suggestion: string }> = [
        ...(gapResult.atsSuggestions ?? []).filter((s) => String(s.type) !== 'KEYWORD_MISSING'),
        ...buildKeywordSuggestions(ats),
      ];

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

      // Link AI-reported gap skills to the catalog
      const catalog = await this.skillsService.resolveMany((gapResult.skillGaps ?? []).map((g) => g.skill));

      // 6. Save all results in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Update analysis
        await tx.analysis.update({
          where: { id: analysisId },
          data: {
            status: AnalysisStatus.COMPLETED,
            matchScore: gapResult.matchScore,
            atsScore: ats.score,
            fitAssessment: asEnum(FitAssessment, gapResult.fitAssessment, FitAssessment.FAIR),
            executiveSummary: gapResult.executiveSummary,
            strengths: gapResult.strengths ?? [],
            weaknesses: gapResult.weaknesses ?? [],
            recommendations: gapResult.recommendations ?? [],
            errorMessage: null,
            rawAnalysis: { ...gapResult, atsSuggestions, atsBreakdown: ats } as any,
            processingTime,
          },
        });

        // Re-runs must not duplicate child rows
        await tx.analysisSkillGap.deleteMany({ where: { analysisId } });
        await tx.analysisAtsSuggestion.deleteMany({ where: { analysisId } });

        await tx.analysisSkillGap.createMany({
          data: (gapResult.skillGaps ?? []).map((g) => ({
            analysisId,
            skillId: catalog.get(skillSlug(g.skill))?.id,
            skillName: g.skill,
            importance: asEnum(GapImportance, g.importance, GapImportance.IMPORTANT),
            category: asEnum(SkillCategory, g.category, SkillCategory.TECHNICAL),
            currentLevel: Math.round(g.currentLevel ?? 0),
            requiredLevel: Math.round(g.requiredLevel ?? 0),
          })),
        });

        await tx.analysisAtsSuggestion.createMany({
          data: atsSuggestions.map((s) => ({
            analysisId,
            type: asEnum(AtsIssueType, s.type, AtsIssueType.FORMAT_ISSUE),
            severity: asEnum(IssueSeverity, s.severity, IssueSeverity.MEDIUM),
            message: s.message,
            suggestion: s.suggestion,
          })),
        });

        // Save recommendations
        await tx.recommendation.createMany({
          data: recommendations.map((r, index) => ({
            userId: analysis.userId,
            analysisId,
            type: asEnum(RecommendationType, r.type, RecommendationType.COURSE),
            title: String(r.title).slice(0, 300),
            description: r.description,
            url: typeof r.url === 'string' && /^https?:\/\//.test(r.url) ? r.url : null,
            duration: r.duration || null,
            difficulty: asEnum(DifficultyLevel, r.difficulty, DifficultyLevel.INTERMEDIATE),
            priority: Number.isFinite(Number(r.priority)) ? Number(r.priority) : index,
            skills: Array.isArray(r.skills) ? r.skills.map(String) : [],
            provider: r.provider ?? null,
            cost: r.cost ?? null,
          })),
        });

        // Save roadmap
        await tx.roadmap.create({
          data: {
            userId: analysis.userId,
            analysisId,
            title: roadmap.title,
            targetRole: roadmap.targetRole,
            milestones: {
              create: roadmap.milestones.map((m, mi) => ({
                title: m.title,
                description: m.description,
                weekNumber: m.week ?? mi + 1,
                position: mi,
                tasks: {
                  create: (m.tasks ?? []).map((t, ti) => ({
                    title: t.title,
                    description: t.description,
                    type: asEnum(RecommendationType, t.type, RecommendationType.COURSE),
                    url: t.url,
                    position: ti,
                  })),
                },
              })),
            },
          },
        });
      });

      // Outside the transaction: a notification problem must not undo a finished analysis
      await this.notifications.notify({
        userId: analysis.userId,
        title: 'Analysis Completed',
        message: `Your resume analysis for ${job_data.title || 'the job'} is ready! Match ${Math.round(gapResult.matchScore)}%, ATS ${ats.score}%.`,
        type: NotificationType.SUCCESS,
        link: `/dashboard/analyses/view?id=${analysisId}`,
      });

      this.logger.log(`Analysis ${analysisId} completed in ${processingTime}ms`);
    } catch (error: any) {
      this.logger.error(`Analysis ${analysisId} failed: ${error.message}`);

      // Only the final attempt marks the analysis FAILED and notifies the user;
      // earlier attempts just let the queue retry (no status flicker, no duplicate notifications).
      if (job.attemptsMade + 1 < (job.opts.attempts ?? 1)) {
        this.logger.warn(`Analysis ${analysisId}: attempt ${job.attemptsMade + 1}/${job.opts.attempts} failed, will retry`);
        throw error;
      }

      // Mark it failed first so the user never sees it stuck "processing", then tell them
      const failed = await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.FAILED, errorMessage: publicErrorMessage(error) },
        select: { userId: true },
      });

      await this.notifications.notify({
        userId: failed.userId,
        title: 'Analysis Failed',
        message: 'There was an error processing your resume analysis. Please try again.',
        type: NotificationType.ERROR,
        link: `/dashboard/analyses/view?id=${analysisId}`,
      });

      throw error;
    }
  }
}
