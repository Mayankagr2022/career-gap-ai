import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a job with AI-parsed JD' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateJobDto) {
    return this.jobsService.create(userId, dto);
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
