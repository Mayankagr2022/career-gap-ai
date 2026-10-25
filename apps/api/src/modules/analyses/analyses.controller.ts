import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalysesService } from './analyses.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiThrottle } from '../../common/throttle/ai-throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analyses')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('analyses')
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post()
  @AiThrottle()
  @ApiOperation({ summary: 'Start a resume-job gap analysis' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAnalysisDto) {
    return this.analysesService.create(userId, dto.resumeId, dto.jobId);
  }

  @Get()
  @ApiOperation({ summary: 'List all analyses' })
  findAll(@CurrentUser('id') userId: string) {
    return this.analysesService.findAll(userId);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest completed analysis for dashboard' })
  getLatest(@CurrentUser('id') userId: string) {
    return this.analysesService.getLatestForDashboard(userId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Lightweight status for polling a running analysis' })
  getStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.analysesService.getStatus(id, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get analysis with full results' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.analysesService.findOne(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an analysis' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.analysesService.delete(id, userId);
  }
}
