import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SkillTrend } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { skillSlug } from '../skills/skills.service';
import { MarketStatsService } from './market-stats.service';

const statInclude = {
  skill: {
    select: {
      name: true,
      relatedTo: { select: { related: { select: { name: true } } } },
    },
  },
} satisfies Prisma.SkillMarketStatInclude;

type StatWithSkill = Prisma.SkillMarketStatGetPayload<{ include: typeof statInclude }>;

/** Flat shape the API has always returned: { skill, demandScore, trend, relatedSkills, ... } */
function toMarketDto(stat: StatWithSkill) {
  const { skill, skillId, source, ...rest } = stat;
  return {
    ...rest,
    skill: skill.name,
    relatedSkills: skill.relatedTo.map((r) => r.related.name),
  };
}

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly marketStats: MarketStatsService,
  ) {}

  private async query(args: Prisma.SkillMarketStatFindManyArgs) {
    await this.marketStats.ensureFresh();
    const stats = await this.prisma.skillMarketStat.findMany({ ...args, include: statInclude });
    return stats.map((s) => toMarketDto(s as StatWithSkill));
  }

  async getSkillDemand(skills?: string[], limit: number = 20) {
    const slugs = (skills ?? []).map(skillSlug).filter(Boolean);
    return this.query({
      where: slugs.length ? { skill: { slug: { in: slugs } } } : {},
      orderBy: { demandScore: 'desc' },
      take: limit,
    });
  }

  async searchSkill(skill: string) {
    return this.query({
      where: { skill: { name: { contains: skill, mode: 'insensitive' } } },
      orderBy: { demandScore: 'desc' },
      take: 20,
    });
  }

  /**
   * Rising skills first. "Rising" needs a week of history to measure, so until enough skills qualify the list
   * is topped up with the most in-demand skills (their trend field says what they are) instead of coming back empty.
   */
  async getTrendingSkills(limit: number = 10) {
    const rising = await this.query({
      where: { trend: SkillTrend.RISING },
      orderBy: { demandScore: 'desc' },
      take: limit,
    });
    if (rising.length >= limit) return rising;

    const topUp = await this.query({
      where: { trend: { not: SkillTrend.RISING } },
      orderBy: [{ demandScore: 'desc' }, { jobCount: 'desc' }],
      take: limit - rising.length,
    });
    return [...rising, ...topUp];
  }

  getOverview() {
    return this.marketStats.getOverview();
  }

  /** Market stats for the skills found on a resume (via the resume_skills join). */
  async getSkillsForResume(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id: resumeId }, select: { userId: true } });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException('Access denied');

    return this.query({
      where: { skill: { resumeSkills: { some: { resumeId } } } },
      orderBy: { demandScore: 'desc' },
    });
  }

  async analyzeSkillMarket(skills: string[]) {
    const prompt = `Analyze market demand for these skills and provide insights: ${skills.join(', ')}

Return JSON:
{
  "overview": "brief market overview",
  "highDemandSkills": ["skills in highest demand"],
  "emergingSkills": ["skills to watch"],
  "salaryImpact": "how these skills affect salary",
  "recommendations": ["actionable insights"]
}`;

    return this.ai.chatWithJson([{ role: 'user', content: prompt }], { temperature: 0.3 });
  }
}
