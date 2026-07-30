import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnalysisDto {
  @ApiProperty({ example: 'uuid-of-resume' })
  @IsUUID()
  resumeId: string;

  @ApiProperty({ example: 'uuid-of-job' })
  @IsUUID()
  jobId: string;
}
