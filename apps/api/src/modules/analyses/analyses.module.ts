import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { AnalysisProcessor } from './analysis.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'analysis-processing' }),
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService, AnalysisProcessor],
  exports: [AnalysesService],
})
export class AnalysesModule {}
