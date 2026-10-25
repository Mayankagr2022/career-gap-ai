import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JobsService, MAX_JD_FILE_SIZE } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ConfirmUploadedJobDto } from './dto/confirm-uploaded-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiThrottle } from '../../common/throttle/ai-throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @AiThrottle()
  @ApiOperation({ summary: 'Create a job with AI-parsed JD' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateJobDto) {
    return this.jobsService.create(userId, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a job description file (PDF, DOCX or TXT) and get a draft to review' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_JD_FILE_SIZE },
    }),
  )
  upload(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.jobsService.uploadFile(userId, file);
  }

  @Post('upload/:draftId/confirm')
  @AiThrottle()
  @ApiOperation({ summary: 'Confirm an uploaded job description: set title and company, then AI-parse and save' })
  confirmUpload(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmUploadedJobDto,
  ) {
    return this.jobsService.confirmUpload(userId, draftId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all jobs' })
  findAll(@CurrentUser('id') userId: string) {
    return this.jobsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific job' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.jobsService.findOne(id, userId);
  }

  @Put(':id')
  @AiThrottle()
  @ApiOperation({ summary: 'Update a job' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.jobsService.delete(id, userId);
  }
}
