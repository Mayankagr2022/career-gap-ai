import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

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
    @Query('limit') limit?: number,
  ) {
    const skills = skillsQuery?.split(',').map((s) => s.trim());
    return this.service.getSkillDemand(skills, limit || 20);
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get trending skills' })
  getTrending(@Query('limit') limit?: number) {
    return this.service.getTrendingSkills(limit || 10);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search for a specific skill' })
  searchSkill(@Query('q') query: string) {
    return this.service.searchSkill(query);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('resume-skills')
  @ApiOperation({ summary: 'Get market data for skills in user resume' })
  getResumeSkills(@Query('resumeId') resumeId: string) {
    return this.service.getSkillsForResume(resumeId);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('analyze')
  @ApiOperation({ summary: 'AI-powered skill market analysis' })
  analyzeSkills(@Query('skills') skillsQuery: string) {
    const skills = skillsQuery?.split(',').map((s) => s.trim()) || [];
    return this.service.analyzeSkillMarket(skills);
  }
}
