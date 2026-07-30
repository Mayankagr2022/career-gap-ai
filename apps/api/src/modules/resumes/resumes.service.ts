import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ResumeParserService } from './resume-parser.service';
import { ResumeStatus } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly parserService: ResumeParserService,
    @InjectQueue('resume-processing') private readonly resumeQueue: Queue,
  ) {}

  async upload(userId: string, file: Express.Multer.File) {
    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are allowed');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Upload to S3
    const { url, key } = await this.storage.uploadFile(file, `resumes/${userId}`);

    // Create resume record
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        filename: `${Date.now()}_${file.originalname}`,
        originalName: file.originalname,
        fileUrl: url,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: ResumeStatus.PENDING,
      },
    });

    // Queue for async processing
    await this.resumeQueue.add(
      'process-resume',
      { resumeId: resume.id, userId },
      { priority: 1, attempts: 3 },
    );

    this.logger.log(`Resume uploaded and queued: ${resume.id}`);
    return resume;
  }

  async findAll(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        atsScore: true,
        parsedData: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { analyses: { take: 5, orderBy: { createdAt: 'desc' } } },
    });

    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException('Access denied');

    return resume;
  }

  async delete(id: string, userId: string) {
    const resume = await this.findOne(id, userId);

    // Delete from S3
    await this.storage.deleteFile(resume.fileKey);

    // Delete from DB (cascades analyses, embeddings)
    await this.prisma.resume.delete({ where: { id } });

    return { message: 'Resume deleted successfully' };
  }

  async getDownloadUrl(id: string, userId: string) {
    const resume = await this.findOne(id, userId);
    const url = await this.storage.getSignedUrl(resume.fileKey, 3600);
    return { url, expiresIn: 3600 };
  }

  async updateStatus(id: string, status: ResumeStatus, data?: any) {
    return this.prisma.resume.update({
      where: { id },
      data: { status, ...data },
    });
  }
}
