import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JobSkillImportance, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '../ai/embedding.service';
import { JobParserAgent, ParsedJob } from '../ai/agents/job-parser.agent';
import { NotificationsService } from '../notifications/notifications.service';
import { singleSkills } from '../../common/scoring/ats-score';
import { SkillsService, skillSlug } from '../skills/skills.service';
import { DocumentTextService } from '../../common/documents/document-text.service';
import { decodeFilename, detectMimeType } from '../../common/documents/document-mime';
import { USER_LIST_LIMIT } from '../../common/utils/list-limit';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ConfirmUploadedJobDto } from './dto/confirm-uploaded-job.dto';
import { JobDraftService, JOB_DRAFT_TTL_SECONDS } from './job-draft.service';
import { extractJobHints } from './jd-field-extractor';

export const MAX_JD_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_DESCRIPTION_CHARS = 100; // same floor as CreateJobDto
const MAX_DESCRIPTION_CHARS = 20000;

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

interface JobFields {
  title: string;
  company: string;
  description: string;
  location?: string | null;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  sourceFilename?: string;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly jobParserAgent: JobParserAgent,
    private readonly skillsService: SkillsService,
    private readonly documents: DocumentTextService,
    private readonly drafts: JobDraftService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    const description = dto.description.trim();
    await this.assertNotDuplicate(userId, description);

    // Parse the JD with AI to extract structured data
    const parsed = await this.jobParserAgent.parse(description, dto.title, dto.company);

    return this.persist(
      userId,
      {
        title: dto.title,
        company: dto.company,
        description,
        location: dto.location,
        remote: dto.remote ?? false,
        salaryMin: dto.salary?.min,
        salaryMax: dto.salary?.max,
        salaryCurrency: dto.salary?.currency || 'USD',
      },
      parsed,
    );
  }

  /**
   * Step 1 of the file flow. Extracts the text and guesses the title and company with plain rules
   * (no AI) and stores the text as a draft; nothing is saved to the jobs table yet.
   */
  async uploadFile(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A job description file is required (multipart field "file")');
    }
    if (!file.size) {
      throw new BadRequestException('The uploaded file is empty');
    }
    if (file.size > MAX_JD_FILE_SIZE) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    const mimeType = detectMimeType(file.buffer, { allowText: true });
    if (!mimeType) {
      throw new BadRequestException('Only PDF, DOCX and TXT files are allowed');
    }

    const text = (await this.documents.extractText(file.buffer, mimeType)).trim();
    if (text.length < MIN_DESCRIPTION_CHARS) {
      throw new BadRequestException(
        `This doesn't look like a complete job description (at least ${MIN_DESCRIPTION_CHARS} characters needed)`,
      );
    }
    if (text.length > MAX_DESCRIPTION_CHARS) {
      throw new BadRequestException(`The job description is too long (maximum ${MAX_DESCRIPTION_CHARS} characters)`);
    }
    await this.assertNotDuplicate(userId, text);

    const filename = decodeFilename(file.originalname).slice(0, 255);
    const hints = extractJobHints(text);
    const draftId = await this.drafts.save(userId, { text, filename });

    return {
      draftId,
      filename,
      title: hints.title ?? null,
      company: hints.company ?? null,
      description: text,
      expiresInSeconds: JOB_DRAFT_TTL_SECONDS,
    };
  }

  /** Step 2 of the file flow: the AI parse runs here, on the stored text, with the user's title and company. */
  async confirmUpload(userId: string, draftId: string, dto: ConfirmUploadedJobDto) {
    const draft = await this.drafts.get(userId, draftId);
    if (!draft) {
      throw new NotFoundException('This upload has expired. Please upload the file again.');
    }
    await this.assertNotDuplicate(userId, draft.text);

    const parsed = await this.jobParserAgent.parse(draft.text, dto.title, dto.company);
    const salary = parsed.salaryRange;
    const hasSalary = Number.isFinite(salary?.min) && Number.isFinite(salary?.max);

    const job = await this.persist(
      userId,
      {
        title: dto.title,
        company: dto.company,
        description: draft.text,
        location: parsed.location,
        remote: !!parsed.remote,
        salaryMin: hasSalary ? salary!.min : undefined,
        salaryMax: hasSalary ? salary!.max : undefined,
        salaryCurrency: salary?.currency || 'USD',
        sourceFilename: draft.filename,
      },
      parsed,
    );

    await this.drafts.remove(userId, draftId);
    return job;
  }

  private async assertNotDuplicate(userId: string, description: string, exceptJobId?: string) {
    const existing = await this.prisma.job.findFirst({
      where: { userId, isActive: true, description, ...(exceptJobId ? { id: { not: exceptJobId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You have already added this job description');
    }
  }

  /** JobSkill rows for a parsed job. */
  private async skillLinks(parsed: ParsedJob) {
    // The model sometimes returns whole phrases ("Cloud platforms (AWS, GCP)"); store one skill per entry so
    // the catalog, skill gaps and market stats count real skills.
    const requiredSkills = singleSkills(parsed.requiredSkills);
    const preferredSkills = singleSkills(parsed.preferredSkills);
    const catalog = await this.skillsService.resolveMany([...requiredSkills, ...preferredSkills]);
    const jobSkills = new Map<string, JobSkillImportance>();
    // Preferred first so a skill listed as both ends up REQUIRED
    preferredSkills.forEach((n) => jobSkills.set(skillSlug(n), JobSkillImportance.PREFERRED));
    requiredSkills.forEach((n) => jobSkills.set(skillSlug(n), JobSkillImportance.REQUIRED));
    return [...jobSkills.entries()]
      .filter(([slug]) => catalog.has(slug))
      .map(([slug, importance]) => ({ skillId: catalog.get(slug)!.id, importance }));
  }

  private async persist(userId: string, fields: JobFields, parsed: ParsedJob) {
    const links = await this.skillLinks(parsed);

    const job = await this.prisma.job.create({
      data: {
        userId,
        title: fields.title,
        company: fields.company,
        description: fields.description,
        location: fields.location ?? undefined,
        remote: fields.remote ?? false,
        salaryMin: fields.salaryMin,
        salaryMax: fields.salaryMax,
        salaryCurrency: fields.salaryCurrency || 'USD',
        experienceLevel: parsed.experienceLevel,
        education: parsed.education,
        jobType: parsed.jobType,
        industry: parsed.industry,
        sourceFilename: fields.sourceFilename,
        skills: { create: links },
      },
      include: skillsInclude,
    });

    await this.notifications.notify({
      userId,
      title: 'Job Added',
      message: `"${fields.title}" at ${fields.company} was added with ${job.skills.length} skills extracted.`,
      type: NotificationType.SUCCESS,
      link: '/dashboard/jobs',
    });

    // Generate and store embeddings async (don't await to speed up response)
    // this.embeddingService
    //   .storeJobEmbedding(job.id, `${fields.title} ${fields.company} ${fields.description}`)
    //   .catch((err) => console.error('Job embedding failed:', err));

    return withSkillArrays(job);
  }

  async findAll(userId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: USER_LIST_LIMIT,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remote: true,
        industry: true,
        jobType: true,
        sourceFilename: true,
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
    const existing = await this.findOne(id, userId);

    // Uploaded jobs keep the description (and the fields parsed from it) as uploaded; only title/company change
    if (existing.sourceFilename) {
      const changesLockedField =
        (dto.description !== undefined && dto.description.trim() !== existing.description) ||
        (dto.location !== undefined && dto.location !== existing.location) ||
        (dto.remote !== undefined && dto.remote !== existing.remote);
      if (changesLockedField) {
        throw new BadRequestException('Only the title and company of an uploaded job can be edited');
      }
    }

    // A new description makes the stored skills and parsed fields wrong (they drive the ATS score), so parse it again
    const description = dto.description?.trim();
    if (description !== undefined && description !== existing.description) {
      await this.assertNotDuplicate(userId, description, id);
      const parsed = await this.jobParserAgent.parse(description, dto.title ?? existing.title, dto.company ?? existing.company);
      const links = await this.skillLinks(parsed);

      const [, job] = await this.prisma.$transaction([
        this.prisma.jobSkill.deleteMany({ where: { jobId: id } }),
        this.prisma.job.update({
          where: { id },
          data: {
            title: dto.title,
            company: dto.company,
            description,
            location: dto.location,
            remote: dto.remote,
            experienceLevel: parsed.experienceLevel,
            education: parsed.education,
            jobType: parsed.jobType,
            industry: parsed.industry,
            skills: { create: links },
          },
          include: skillsInclude,
        }),
      ]);
      return withSkillArrays(job);
    }

    const job = await this.prisma.job.update({
      where: { id },
      data: {
        title: dto.title,
        company: dto.company,
        location: dto.location,
        remote: dto.remote,
      },
      include: skillsInclude,
    });
    return withSkillArrays(job);
  }

  async delete(id: string, userId: string) {
    // Ownership check only; no need to load skills and analyses
    const job = await this.prisma.job.findUnique({ where: { id }, select: { userId: true, isActive: true } });
    if (!job || !job.isActive) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.job.update({ where: { id }, data: { isActive: false } });
    return { message: 'Job deleted successfully' };
  }
}
