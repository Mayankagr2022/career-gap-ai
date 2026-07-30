import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumeProcessor } from './resume.processor';
import { ResumeParserService } from './resume-parser.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'resume-processing',
    }),
  ],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeProcessor, ResumeParserService],
  exports: [ResumesService],
})
export class ResumesModule {}
