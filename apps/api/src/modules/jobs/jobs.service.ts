import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JobSkillImportance, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '../ai/embedding.service';
import { JobParserAgent } from '../ai/agents/job-parser.agent';
import { SkillsService, skillSlug } from '../skills/skills.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

const skillsInclude = {
  skills: { include: { skill: { select: { name: true } } }, orderBy: { skill: { name: 'asc' } } },
} satisfies Prisma.JobInclude;

type JobWithSkills = Prisma.JobGetPayload<{ include: typeof skillsInclude }>;

/** Flatten JobSkill rows back into the requiredSkills/preferredSkills arrays the API has always exposed. */
export function withSkillArrays<T extends JobWithSkills>(job: T) {
  const { skills, ...rest } = job;
  const pick = (importance: JobSkillImportance) =>
    skills.filter((s) => s.importance === importance).map((s) => s.skill.name);
  return {
    ...rest,
    requiredSkills: pick(JobSkillImportance.REQUIRED),
    preferredSkills: pick(JobSkillImportance.PREFERRED),
  };
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly jobParserAgent: JobParserAgent,
    private readonly skillsService: SkillsService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    // Parse the JD with AI to extract structured data
    const parsed = await this.jobParserAgent.parse(dto.description, dto.title, dto.company);

    const catalog = await this.skillsService.resolveMany([
      ...parsed.requiredSkills,
      ...parsed.preferredSkills,
    ]);
    const jobSkills = new Map<string, JobSkillImportance>();
    // Preferred first so a skill listed as both ends up REQUIRED
    parsed.preferredSkills.forEach((n) => jobSkills.set(skillSlug(n), JobSkillImportance.PREFERRED));
    parsed.requiredSkills.forEach((n) => jobSkills.set(skillSlug(n), JobSkillImportance.REQUIRED));

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
        experienceLevel: parsed.experienceLevel,
        education: parsed.education,
        jobType: parsed.jobType,
        industry: parsed.industry,
        skills: {
          create: [...jobSkills.entries()]
            .filter(([slug]) => catalog.has(slug))
            .map(([slug, importance]) => ({ skillId: catalog.get(slug)!.id, importance })),
        },
      },
      include: skillsInclude,
    });

    // Generate and store embeddings async (don't await to speed up response)
    // this.embeddingService
    //   .storeJobEmbedding(job.id, `${dto.title} ${dto.company} ${dto.description}`)
    //   .catch((err) => console.error('Job embedding failed:', err));

    return withSkillArrays(job);
  }

  async findAll(userId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remote: true,
        industry: true,
        jobType: true,
        createdAt: true,
        skills: skillsInclude.skills,
        _count: { select: { analyses: true } },
      },
    });
    return jobs.map((j) => withSkillArrays(j as any));
  }

  async findOne(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        ...skillsInclude,
        analyses: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, matchScore: true, atsScore: true, status: true, createdAt: true },
        },
      },
    });

    if (!job || !job.isActive) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');

    return withSkillArrays(job);
  }

  async update(id: string, userId: string, dto: UpdateJobDto) {
    await this.findOne(id, userId);

    const job = await this.prisma.job.update({
      where: { id },
      data: {
        title: dto.title,
        company: dto.company,
        description: dto.description,
        location: dto.location,
        remote: dto.remote,
      },
      include: skillsInclude,
    });
    return withSkillArrays(job);
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.job.update({ where: { id }, data: { isActive: false } });
    return { message: 'Job deleted successfully' };
  }
}
