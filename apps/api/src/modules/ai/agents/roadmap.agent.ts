import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';
import { asArray, asNumber, asString } from './ai-output.util';
import { ParsedResume } from '@career-gap-ai/shared';
import { GapAnalysisResult } from './gap-analysis.agent';
import { ParsedJob } from './job-parser.agent';
import { RecommendationItem } from './recommendation.agent';

export interface GeneratedRoadmap {
  title: string;
  targetRole: string;
  estimatedDuration: string;
  milestones: {
    id: string;
    title: string;
    description: string;
    week: number;
    tasks: {
      id: string;
      title: string;
      description: string;
      type: 'PROJECT' | 'CERTIFICATION' | 'COURSE';
      url?: string;
    }[];
  }[];
}

@Injectable()
export class RoadmapAgent {
  private readonly logger = new Logger(RoadmapAgent.name);

  constructor(private readonly ai: AiService) {}

  async generate(
    resume: ParsedResume,
    job: ParsedJob,
    gaps: GapAnalysisResult,
    recommendations: RecommendationItem[],
  ): Promise<GeneratedRoadmap> {
    this.logger.log(`Generating roadmap: ${resume.name} → ${job.title}`);

    const prompt = `Create a detailed week-by-week career roadmap to help someone transition into a new role.

CURRENT STATE:
- Experience: ${resume.totalYearsExperience} years as ${resume.experience[0]?.title || 'Professional'}
- Current Skills: ${resume.skills.slice(0, 15).join(', ')}
- Seniority: ${resume.seniorityLevel}

TARGET ROLE: ${job.title} at ${job.company}
MATCH SCORE: ${gaps.matchScore}%
KEY GAPS: ${(gaps.skillGaps ?? []).filter((g) => g.importance === 'CRITICAL').map((g) => g.skill).join(', ')}

AVAILABLE RECOMMENDATIONS:
${recommendations.slice(0, 6).map((r) => `- ${r.title} (${r.type}, ${r.duration})`).join('\n')}

Create a realistic 12-24 week roadmap organized into 3-4 major milestones.

Return ONLY valid JSON:
{
  "title": "Your Path to [Job Title]",
  "targetRole": "${job.title}",
  "estimatedDuration": "X weeks/months",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "Milestone title",
      "description": "What this milestone achieves",
      "week": 4,
      "tasks": [
        {
          "id": "task-1-1",
          "title": "Specific task",
          "description": "What to do",
          "type": "PROJECT|CERTIFICATION|COURSE",
          "url": "optional URL"
        }
      ]
    }
  ]
}`;

    const result = await this.ai.chatWithJson<GeneratedRoadmap>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3 },
    );

    // Normalise untrusted model output
    result.title = asString(result.title, `Your Path to ${job.title}`);
    result.targetRole = asString(result.targetRole, job.title);
    result.milestones = asArray<any>(result.milestones)
      .filter((m) => m && asString(m.title))
      .map((m, mi) => ({
        ...m,
        id: asString(m.id, `milestone-${mi + 1}`),
        title: asString(m.title),
        description: asString(m.description),
        week: asNumber(m.week, (mi + 1) * 4),
        tasks: asArray<any>(m.tasks)
          .filter((t) => t && asString(t.title))
          .map((t, ti) => ({ ...t, id: asString(t.id, `task-${mi + 1}-${ti + 1}`), title: asString(t.title), description: asString(t.description) })),
      }));

    this.logger.log(`Roadmap generated with ${result.milestones.length} milestones`);
    return result;
  }
}
