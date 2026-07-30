import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalysisStatus, ResumeStatus } from '@prisma/client';

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
    if (!job) throw new NotFoundException('Job not found');
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

  async findAll(userId: string) {
    return this.prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: { select: { id: true, originalName: true, status: true } },
        job: { select: { id: true, title: true, company: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: {
        resume: { select: { id: true, originalName: true, parsedData: true } },
        job: true,
        aiRecommendations: { orderBy: { priority: 'asc' } },
        roadmaps: true,
      },
    });

    if (!analysis) throw new NotFoundException('Analysis not found');
    if (analysis.userId !== userId) throw new ForbiddenException('Access denied');

    return analysis;
  }

  async delete(id: string, userId: string) {
    const analysis = await this.findOne(id, userId);
    await this.prisma.analysis.delete({ where: { id } });
    return { message: 'Analysis deleted' };
  }

  async getLatestForDashboard(userId: string) {
    return this.prisma.analysis.findFirst({
      where: { userId, status: AnalysisStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      include: {
        resume: { select: { originalName: true } },
        job: { select: { title: true, company: true } },
      },
    });
  }
}
