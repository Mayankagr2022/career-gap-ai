import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ResumeParserService } from './resume-parser.service';
import { ResumeStatus } from '@prisma/client';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Browsers (notably on Windows) sometimes send an empty or generic mimetype, so the type is
// derived from the file's magic bytes instead of trusting the client-supplied header.
function detectMimeType(buffer: Buffer): string | null {
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return PDF_MIME;
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return DOCX_MIME; // zip container
  return null;
}

// Multer decodes multipart filenames as latin1; recover UTF-8 names such as "résumé.pdf"
function decodeFilename(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

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
    if (!file) {
      throw new BadRequestException('A resume file is required (multipart field "file")');
    }
    if (!file.size) {
      throw new BadRequestException('The uploaded file is empty');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    const mimeType = detectMimeType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException('Only PDF and DOCX files are allowed');
    }
    const originalName = decodeFilename(file.originalname);

    // Upload to S3
    const { url, key } = await this.storage.uploadFile(
      { ...file, originalname: originalName, mimetype: mimeType },
      `resumes/${userId}`,
    );

    // Create resume record; don't leave an orphaned S3 object if this fails
    let resume;
    try {
      resume = await this.prisma.resume.create({
        data: {
          userId,
          filename: `${Date.now()}_${originalName}`,
          originalName,
          fileUrl: url,
          fileKey: key,
          fileSize: file.size,
          mimeType,
          status: ResumeStatus.PENDING,
        },
      });
    } catch (error) {
      await this.storage.deleteFile(key).catch((e) => this.logger.warn(`Orphan cleanup failed for ${key}: ${e.message}`));
      throw error;
    }

    // Queue for async processing; if that fails the resume would sit in PENDING forever
    try {
      await this.resumeQueue.add(
        'process-resume',
        { resumeId: resume.id, userId },
        { priority: 1, attempts: 3 },
      );
    } catch (error) {
      this.logger.error(`Failed to queue resume ${resume.id}: ${error.message}`);
      await this.prisma.resume.update({
        where: { id: resume.id },
        data: { status: ResumeStatus.FAILED, errorMessage: 'Could not start processing. Please try uploading again.' },
      });
      throw new ServiceUnavailableException('Resume processing is temporarily unavailable. Please try again shortly.');
    }

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
        errorMessage: true,
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

    // Best-effort S3 delete: a storage hiccup must not make the resume undeletable
    try {
      await this.storage.deleteFile(resume.fileKey);
    } catch (error) {
      this.logger.warn(`Failed to delete S3 object ${resume.fileKey}: ${error.message}`);
    }

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
