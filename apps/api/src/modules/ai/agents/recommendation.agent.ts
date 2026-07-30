import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';
import { ParsedResume } from '@career-gap-ai/shared';
import { GapAnalysisResult } from './gap-analysis.agent';
import { ParsedJob } from './job-parser.agent';

export interface RecommendationItem {
  type: 'PROJECT' | 'CERTIFICATION' | 'COURSE';
  title: string;
  description: string;
  url?: string;
  duration: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  priority: number;
  skills: string[];
  provider?: string;
  cost: 'FREE' | 'PAID' | 'SUBSCRIPTION';
  rationale: string;
}

@Injectable()
export class RecommendationAgent {
  private readonly logger = new Logger(RecommendationAgent.name);

  constructor(private readonly ai: AiService) {}

  async generate(
    resume: ParsedResume,
    job: ParsedJob,
    gaps: GapAnalysisResult,
  ): Promise<RecommendationItem[]> {
    this.logger.log(`Generating recommendations for ${resume.name}`);

    const criticalGaps = gaps.skillGaps
      .filter((g) => g.importance === 'CRITICAL' || g.importance === 'IMPORTANT')
      .map((g) => g.skill)
      .join(', ');

    const prompt = `Generate personalized learning recommendations for a career gap.

TARGET ROLE: ${job.title} at ${job.company}
CURRENT SKILLS: ${resume.skills.slice(0, 20).join(', ')}
EXPERIENCE LEVEL: ${resume.seniorityLevel} (${resume.totalYearsExperience} years)
CRITICAL SKILL GAPS: ${criticalGaps || 'General skill improvement needed'}
MATCH SCORE: ${gaps.matchScore}%

Generate 8-12 specific, actionable recommendations (mix of projects, certifications, and courses).
For each recommendation, provide REAL resources that exist (Coursera, Udemy, AWS, Google, etc.)

Return ONLY valid JSON array:
[
  {
    "type": "PROJECT|CERTIFICATION|COURSE",
    "title": "specific title",
    "description": "2-3 sentence description of what they'll learn/build",
    "url": "actual URL to resource or null",
    "duration": "estimated time (e.g. '2 weeks', '3 months')",
    "difficulty": "BEGINNER|INTERMEDIATE|ADVANCED",
    "priority": number (1=highest, lower is better),
    "skills": ["skills this covers"],
    "provider": "e.g. Coursera, AWS, Google, GitHub",
    "cost": "FREE|PAID|SUBSCRIPTION",
    "rationale": "why this is recommended for this specific gap"
  }
]`;

    const result = await this.ai.chatWithJson<RecommendationItem[]>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.4 },
    );

    const recommendations = Array.isArray(result) ? result : [];
    recommendations.sort((a, b) => a.priority - b.priority);

    this.logger.log(`Generated ${recommendations.length} recommendations`);
    return recommendations.slice(0, 12);
  }
}
