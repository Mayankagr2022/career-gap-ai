import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ConfirmUploadedJobDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Google' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company: string;
}
