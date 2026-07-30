import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { memoryStorage } from 'multer';

@ApiTags('resumes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a resume (PDF or DOCX)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.resumesService.upload(userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all resumes' })
  findAll(@CurrentUser('id') userId: string) {
    return this.resumesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume with analyses' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resumesService.findOne(id, userId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a signed download URL' })
  getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resumesService.getDownloadUrl(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a resume' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.resumesService.delete(id, userId);
  }
}
