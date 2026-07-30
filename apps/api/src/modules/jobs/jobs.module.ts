import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'job-processing' }),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
