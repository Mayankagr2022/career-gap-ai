import { BadRequestException, Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiThrottle } from '../../common/throttle/ai-throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/** Query-string limit -> integer in [1, 100]; junk or missing falls back to the default. */
function clampLimit(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 100);
}

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly service: MarketService) {}

  @Public()
  @Get('skills')
  @ApiOperation({ summary: 'Get skill market demand data' })
  @ApiQuery({ name: 'skills', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSkillDemand(
    @Query('skills') skillsQuery?: string,
    @Query('limit') limit?: string,
  ) {
    const skills = skillsQuery?.split(',').map((s) => s.trim()).filter(Boolean);
    return this.service.getSkillDemand(skills, clampLimit(limit, 20));
  }

  @Public()
  @Get('overview')
  @ApiOperation({ summary: 'How much data the market stats are based on (job count, trend history)' })
  getOverview() {
    return this.service.getOverview();
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get trending skills' })
  getTrending(@Query('limit') limit?: string) {
    return this.service.getTrendingSkills(clampLimit(limit, 10));
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search for a specific skill' })
  searchSkill(@Query('q') query?: string) {
    return this.service.searchSkill((query ?? '').trim());
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('resume-skills')
  @ApiOperation({ summary: 'Get market data for skills in user resume' })
  getResumeSkills(
    @CurrentUser('id') userId: string,
    @Query('resumeId', ParseUUIDPipe) resumeId: string,
  ) {
    return this.service.getSkillsForResume(resumeId, userId);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('analyze')
  @AiThrottle()
  @ApiOperation({ summary: 'AI-powered skill market analysis' })
  analyzeSkills(@Query('skills') skillsQuery: string) {
    const skills = skillsQuery?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    if (skills.length === 0) throw new BadRequestException('Provide at least one skill (?skills=react,node)');
    if (skills.length > 25) throw new BadRequestException('At most 25 skills per request');
    return this.service.analyzeSkillMarket(skills);
  }
}
