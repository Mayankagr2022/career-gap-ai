import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';
import { asStringArray } from './ai-output.util';

export interface ParsedJob {
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  experienceLevel?: string;
  education?: string;
  jobType?: string;
  industry?: string;
  keyKeywords: string[];
  salaryRange?: { min: number; max: number; currency: string };
}

@Injectable()
export class JobParserAgent {
  private readonly logger = new Logger(JobParserAgent.name);

  constructor(private readonly ai: AiService) {}

  async parse(jobDescription: string, title: string, company: string): Promise<ParsedJob> {
    this.logger.log(`Parsing job: ${title} at ${company}`);

    const prompt = `Parse this job description and extract structured information.

Job Title: ${title}
Company: ${company}

Job Description:
${jobDescription}

Return ONLY valid JSON:
{
  "title": "string",
  "company": "string",
  "location": "string or null",
  "remote": boolean,
  "requiredSkills": ["one skill per entry, e.g. "React", "PostgreSQL", "Team leadership"; never a sentence, a list or text in parentheses"],
  "preferredSkills": ["same format: one skill per entry"],
  "responsibilities": ["key job responsibilities"],
  "qualifications": ["required qualifications"],
  "experienceLevel": "string (e.g. '3-5 years') or null",
  "education": "string (e.g. 'Bachelor's degree in CS') or null",
  "jobType": "FULL_TIME|PART_TIME|CONTRACT|FREELANCE|INTERNSHIP",
  "industry": "string or null",
  "keyKeywords": ["important ATS keywords from the description"],
  "salaryRange": { "min": number, "max": number, "currency": "USD" } or null
}`;

    const result = await this.ai.chatWithJson<ParsedJob>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.1 },
    );

    result.requiredSkills = asStringArray(result.requiredSkills);
    result.preferredSkills = asStringArray(result.preferredSkills);
    result.keyKeywords = asStringArray(result.keyKeywords);
    result.responsibilities = asStringArray(result.responsibilities);
    result.qualifications = asStringArray(result.qualifications);

    return result;
  }
}
