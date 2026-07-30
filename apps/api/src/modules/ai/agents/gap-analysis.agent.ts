import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';
import { ParsedResume, SkillGap, SkillImportance, SkillCategory, AtsSuggestion, AtsIssueType, IssueSeverity } from '@career-gap-ai/shared';
import { ParsedJob } from './job-parser.agent';

export interface GapAnalysisResult {
  matchScore: number;
  atsScore: number;
  skillGaps: SkillGap[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  atsSuggestions: AtsSuggestion[];
  executiveSummary: string;
  fitAssessment: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

@Injectable()
export class GapAnalysisAgent {
  private readonly logger = new Logger(GapAnalysisAgent.name);

  constructor(private readonly ai: AiService) {}

  async analyze(resume: ParsedResume, job: ParsedJob, rawJobDescription: string): Promise<GapAnalysisResult> {
    this.logger.log(`Analyzing gap: ${resume.name} vs ${job.title} at ${job.company}`);

    const systemPrompt = `You are an expert career coach and hiring specialist with 20 years of experience.
Analyze resume-job fit with precision. Be specific, actionable, and honest.
Consider both technical skills and soft skills. Account for transferable experience.`;

    const prompt = `Analyze the fit between this candidate and job position.

CANDIDATE PROFILE:
Name: ${resume.name}
Experience: ${resume.totalYearsExperience} years (${resume.seniorityLevel})
Skills: ${resume.skills.join(', ')}
Recent Role: ${resume.experience[0]?.title || 'N/A'} at ${resume.experience[0]?.company || 'N/A'}
Education: ${resume.education.map((e) => `${e.degree} in ${e.field}`).join(', ')}
Certifications: ${resume.certifications.map((c) => c.name).join(', ') || 'None'}

JOB REQUIREMENTS:
Title: ${job.title} at ${job.company}
Required Skills: ${job.requiredSkills.join(', ')}
Preferred Skills: ${job.preferredSkills.join(', ')}
Experience Required: ${job.experienceLevel || 'Not specified'}
Education Required: ${job.education || 'Not specified'}
Remote: ${job.remote ? 'Yes' : 'No'}

JOB DESCRIPTION (for ATS keywords):
${rawJobDescription.substring(0, 3000)}

Return ONLY valid JSON:
{
  "matchScore": number (0-100),
  "atsScore": number (0-100, how well resume would pass ATS systems),
  "skillGaps": [
    {
      "skill": "skill name",
      "importance": "CRITICAL|IMPORTANT|NICE_TO_HAVE",
      "currentLevel": number (0-10),
      "requiredLevel": number (0-10),
      "category": "TECHNICAL|SOFT|DOMAIN|TOOL|CERTIFICATION"
    }
  ],
  "strengths": ["specific strength statements"],
  "weaknesses": ["specific weakness/gap statements"],
  "recommendations": ["actionable recommendation strings"],
  "atsSuggestions": [
    {
      "type": "KEYWORD_MISSING|FORMAT_ISSUE|LENGTH_ISSUE|SECTION_MISSING|QUANTIFICATION_MISSING",
      "message": "issue description",
      "severity": "HIGH|MEDIUM|LOW",
      "suggestion": "specific fix suggestion"
    }
  ],
  "executiveSummary": "2-3 sentence overall assessment",
  "fitAssessment": "EXCELLENT|GOOD|FAIR|POOR"
}`;

    const result = await this.ai.chatWithJson<GapAnalysisResult>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 6000 },
    );

    // Clamp scores
    result.matchScore = Math.max(0, Math.min(100, Math.round(result.matchScore)));
    result.atsScore = Math.max(0, Math.min(100, Math.round(result.atsScore)));

    this.logger.log(
      `Analysis complete: match=${result.matchScore}%, ATS=${result.atsScore}%, fit=${result.fitAssessment}`,
    );

    return result;
  }
}
