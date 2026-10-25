import { IsString, IsOptional, IsBoolean, IsObject, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 'Google' })
  @IsString()
  @MinLength(1)
  company: string;

  @ApiProperty({ example: 'We are looking for...' })
  @IsString()
  @MinLength(100, { message: 'Please provide a more detailed job description (min 100 chars)' })
  description: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ obj }) => obj.remote)
  @IsBoolean()
  remote?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  salary?: {
    min: number;
    max: number;
    currency?: string;
  };
}
