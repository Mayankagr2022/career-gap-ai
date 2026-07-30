import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async getSkillDemand(skills?: string[], limit: number = 20) {
    const where = skills?.length
      ? { skill: { in: skills } }
      : {};

    return this.prisma.skillMarketData.findMany({
      where,
      orderBy: { demandScore: 'desc' },
      take: limit,
    });
  }

  async searchSkill(skill: string) {
    return this.prisma.skillMarketData.findMany({
      where: { skill: { contains: skill, mode: 'insensitive' } },
      orderBy: { demandScore: 'desc' },
      take: 20,
    });
  }

  async getTrendingSkills(limit: number = 10) {
    return this.prisma.skillMarketData.findMany({
      where: { trend: 'RISING' },
      orderBy: { demandScore: 'desc' },
      take: limit,
    });
  }

  async getSkillsForResume(resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { parsedData: true },
    });

    if (!resume?.parsedData) return [];

    const parsed = resume.parsedData as any;
    const skills: string[] = parsed.skills || [];

    return this.prisma.skillMarketData.findMany({
      where: { skill: { in: skills } },
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
