import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('recommendations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'List recommendations, optionally filtered by analysis' })
  @ApiQuery({ name: 'analysisId', required: false })
  findAll(@CurrentUser('id') userId: string, @Query('analysisId') analysisId?: string) {
    return this.service.findAll(userId, analysisId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get recommendation completion stats' })
  getStats(@CurrentUser('id') userId: string) {
    return this.service.getStats(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark recommendation as completed' })
  markComplete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.markComplete(id, userId);
  }

  @Patch(':id/incomplete')
  @ApiOperation({ summary: 'Mark recommendation as not completed' })
  markIncomplete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.markIncomplete(id, userId);
  }
}
