import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalysisStatus, Prisma, ResumeStatus } from '@prisma/client';
import { USER_LIST_LIMIT } from '../../common/utils/list-limit';
import { toRoadmapDto } from '../roadmaps/roadmaps.service';

const gapsInclude = {
  skillGaps: { orderBy: { requiredLevel: 'desc' } },
  atsSuggestions: true,
} satisfies Prisma.AnalysisInclude;

/** Map relational gap/suggestion rows back to the arrays the API has always returned. */
function withGapArrays<T extends { skillGaps: any[]; atsSuggestions: any[] }>(analysis: T) {
  return {
    ...analysis,
    skillGaps: analysis.skillGaps.map((g) => ({
      skill: g.skillName,
      importance: g.importance,
      currentLevel: g.currentLevel,
      requiredLevel: g.requiredLevel,
      category: g.category,
    })),
    atsSuggestions: analysis.atsSuggestions.map((s) => ({
      type: s.type,
      message: s.message,
      severity: s.severity,
      suggestion: s.suggestion,
    })),
  };
}

/** An analysis still PENDING/PROCESSING after this long has lost its job (worker crash, lost queue entry). */
export const STALE_ANALYSIS_MS = 15 * 60 * 1000;
/** Analyses one user may have running at once; each makes several AI calls. */
export const MAX_ACTIVE_ANALYSES_PER_USER = 3;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class AnalysesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalysesService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('analysis-processing') private readonly analysisQueue: Queue,
  ) {}

  onModuleInit() {
    this.sweepTimer = setInterval(() => {
      this.failStale().catch((e) => this.logger.warn(`Stale analysis sweep failed: ${e.message}`));
    }, SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /** Marks analyses whose job never finished as FAILED so the UI stops polling them. Safe to run on several instances. */
  async failStale(now = Date.now()) {
    const { count } = await this.prisma.analysis.updateMany({
      where: {
        status: { in: [AnalysisStatus.PENDING, AnalysisStatus.PROCESSING] },
        updatedAt: { lt: new Date(now - STALE_ANALYSIS_MS) },
      },
      data: { status: AnalysisStatus.FAILED, errorMessage: 'The analysis took too long and was stopped. Please try again.' },
    });
    if (count > 0) this.logger.warn(`Marked ${count} stale analyses as FAILED`);
    return count;
  }

  async create(userId: string, resumeId: string, jobId: string) {
    // Validate resume belongs to user and is analyzed
    const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException('Access denied to resume');
    if (resume.status !== ResumeStatus.ANALYZED) {
      throw new BadRequestException('Resume must be fully processed before analysis. Please wait.');
    }

    // Validate job belongs to user
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.isActive) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied to job');

    // Cap concurrent runs per user and refuse a second run of the same pair, so one account cannot flood the AI queue
    const active = await this.prisma.analysis.findMany({
      where: { userId, status: { in: [AnalysisStatus.PENDING, AnalysisStatus.PROCESSING] } },
      select: { resumeId: true, jobId: true },
    });
    if (active.some((a) => a.resumeId === resumeId && a.jobId === jobId)) {
      throw new BadRequestException('This resume and job are already being analyzed. Please wait for it to finish.');
    }
    if (active.length >= MAX_ACTIVE_ANALYSES_PER_USER) {
      throw new HttpException(
        'You have several analyses running. Please wait for one to finish before starting another.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Create analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        resumeId,
        jobId,
        status: AnalysisStatus.PENDING,
      },
    });

    // Queue analysis; if that fails the row would sit in PENDING forever
    try {
      await this.analysisQueue.add(
        'process-analysis',
        { analysisId: analysis.id },
        { priority: 1, attempts: 3 },
      );
    } catch (error: any) {
      this.logger.error(`Failed to queue analysis ${analysis.id}: ${error.message}`);
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: AnalysisStatus.FAILED, errorMessage: 'Could not start the analysis. Please try again.' },
      });
      throw new ServiceUnavailableException('Analysis is temporarily unavailable. Please try again shortly.');
    }

    return analysis;
  }

  /** List view: summary fields only. The full result (gaps, raw AI output, roadmap) comes from findOne. */
  async findAll(userId: string) {
    return this.prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: USER_LIST_LIMIT,
      select: {
        id: true,
        status: true,
        matchScore: true,
        atsScore: true,
        fitAssessment: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        resume: { select: { id: true, originalName: true, status: true } },
        job: { select: { id: true, title: true, company: true } },
      },
    });
  }

  /** Cheap polling target: one indexed row, no joins. */
  async getStatus(id: string, userId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, errorMessage: true, updatedAt: true },
    });
    if (!analysis) throw new NotFoundException('Analysis not found');
    if (analysis.userId !== userId) throw new ForbiddenException('Access denied');
    const { userId: _owner, ...status } = analysis;
    return status;
  }

  async findOne(id: string, userId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: {
        ...gapsInclude,
        resume: { select: { id: true, originalName: true, parsedData: true } },
        job: { include: { skills: { include: { skill: { select: { name: true } } } } } },
        aiRecommendations: { orderBy: { priority: 'asc' } },
        roadmaps: {
          include: {
            milestones: { orderBy: { position: 'asc' }, include: { tasks: { orderBy: { position: 'asc' } } } },
          },
        },
      },
    });

    if (!analysis) throw new NotFoundException('Analysis not found');
    if (analysis.userId !== userId) throw new ForbiddenException('Access denied');

    const { job, roadmaps, ...rest } = withGapArrays(analysis);
    return {
      ...rest,
      job: {
        ...job,
        requiredSkills: job.skills.filter((s) => s.importance === 'REQUIRED').map((s) => s.skill.name),
        preferredSkills: job.skills.filter((s) => s.importance === 'PREFERRED').map((s) => s.skill.name),
      },
      roadmaps: roadmaps.map(toRoadmapDto),
    };
  }

  async delete(id: string, userId: string) {
    await this.getStatus(id, userId); // ownership / existence check
    await this.prisma.analysis.delete({ where: { id } });
    return { message: 'Analysis deleted' };
  }

  async getLatestForDashboard(userId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { userId, status: AnalysisStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      include: {
        ...gapsInclude,
        resume: { select: { originalName: true } },
        job: { select: { title: true, company: true } },
      },
    });
    return analysis ? withGapArrays(analysis) : null;
  }
}
