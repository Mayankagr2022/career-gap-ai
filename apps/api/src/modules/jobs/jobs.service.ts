import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '../ai/embedding.service';
import { JobParserAgent } from '../ai/agents/job-parser.agent';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly jobParserAgent: JobParserAgent,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    // Parse the JD with AI to extract structured data
    const parsed = await this.jobParserAgent.parse(dto.description, dto.title, dto.company);

    const job = await this.prisma.job.create({
      data: {
        userId,
        title: dto.title,
        company: dto.company,
        description: dto.description,
        location: dto.location,
        remote: dto.remote ?? false,
        salaryMin: dto.salary?.min,
        salaryMax: dto.salary?.max,
        salaryCurrency: dto.salary?.currency || 'USD',
        requiredSkills: parsed.requiredSkills,
        preferredSkills: parsed.preferredSkills,
        experienceLevel: parsed.experienceLevel,
        education: parsed.education,
        jobType: parsed.jobType,
        industry: parsed.industry,
      },
    });

    // Generate and store embeddings async (don't await to speed up response)
    // this.embeddingService
    //   .storeJobEmbedding(job.id, `${dto.title} ${dto.company} ${dto.description}`)
    //   .catch((err) => console.error('Job embedding failed:', err));

    return job;
  }

  async findAll(userId: string) {
    return this.prisma.job.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remote: true,
        requiredSkills: true,
        preferredSkills: true,
        industry: true,
        jobType: true,
        createdAt: true,
        _count: { select: { analyses: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        analyses: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, matchScore: true, atsScore: true, status: true, createdAt: true },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');

    return job;
  }

  async update(id: string, userId: string, dto: UpdateJobDto) {
    await this.findOne(id, userId);

    return this.prisma.job.update({
      where: { id },
      data: {
        title: dto.title,
        company: dto.company,
        description: dto.description,
        location: dto.location,
        remote: dto.remote,
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.job.update({ where: { id }, data: { isActive: false } });
    return { message: 'Job deleted successfully' };
  }
}
