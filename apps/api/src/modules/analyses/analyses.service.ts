import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalysisStatus, Prisma, ResumeStatus } from '@prisma/client';
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

@Injectable()
export class AnalysesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('analysis-processing') private readonly analysisQueue: Queue,
  ) {}

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

    // Create analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        resumeId,
        jobId,
        status: AnalysisStatus.PENDING,
      },
    });

    // Queue analysis
    await this.analysisQueue.add(
      'process-analysis',
      { analysisId: analysis.id },
      { priority: 1, attempts: 3 },
    );

    return analysis;
  }

  /** List view: summary fields only. The full result (gaps, raw AI output, roadmap) comes from findOne. */
  async findAll(userId: string) {
    return this.prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
