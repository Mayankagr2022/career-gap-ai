import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';
import { asArray, asNumber, asString, asStringArray } from './ai-output.util';
import { ParsedResume, SeniorityLevel } from '@career-gap-ai/shared';

@Injectable()
export class ResumeParserAgent {
  private readonly logger = new Logger(ResumeParserAgent.name);

  constructor(private readonly ai: AiService) {}

  async parse(resumeText: string): Promise<ParsedResume> {
    this.logger.log('Parsing resume with AI...');

    const systemPrompt = `You are an expert resume parser. Extract structured information from resumes accurately.
Always respond with valid JSON matching the exact schema provided.
Be thorough and accurate - extract ALL skills, experiences, and achievements mentioned.`;

    const userPrompt = `Parse this resume and extract all information into JSON format.

Resume Text:
${resumeText}

Return ONLY valid JSON with this exact structure:
{
  "name": "string",
  "email": "string",
  "phone": "string or null",
  "location": "string or null", 
  "summary": "string or null",
  "skills": ["array of skill strings"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "startDate": "YYYY-MM string",
      "endDate": "YYYY-MM string or null",
      "current": boolean,
      "description": "string",
      "skills": ["skills used in this role"],
      "achievements": ["specific achievements with metrics if available"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "YYYY string",
      "endDate": "YYYY string or null",
      "gpa": number or null
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "YYYY-MM string or null",
      "expiryDate": "YYYY-MM string or null",
      "credentialId": "string or null"
    }
  ],
  "languages": ["array of language strings"],
  "totalYearsExperience": number,
  "seniorityLevel": "INTERN|JUNIOR|MID|SENIOR|LEAD|PRINCIPAL|STAFF"
}`;

    const result = await this.ai.chatWithJson<ParsedResume>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.1 });

    // Don't invent a resume from nothing: an empty/garbled AI answer is an error, not data
    if (
      !result ||
      typeof result !== 'object' ||
      (!asString(result.name) && !asStringArray(result.skills).length && !asArray(result.experience).length)
    ) {
      throw new Error('AI returned no usable resume data');
    }

    // Validate and normalize
    result.seniorityLevel = this.normalizeSeniority(
      result.seniorityLevel,
      result.totalYearsExperience,
    );
    result.skills = asStringArray(result.skills);
    result.experience = asArray<any>(result.experience).filter(Boolean);
    result.education = asArray<any>(result.education).filter(Boolean);
    result.certifications = asArray<any>(result.certifications).filter(Boolean);
    result.languages = asStringArray(result.languages);
    result.totalYearsExperience = Math.max(0, asNumber(result.totalYearsExperience));
    result.name = asString(result.name);

    this.logger.log(`Resume parsed: ${result.name}, ${result.totalYearsExperience}y exp, ${result.skills.length} skills`);
    return result;
  }

  private normalizeSeniority(level: any, yearsExp: number): SeniorityLevel {
    if (Object.values(SeniorityLevel).includes(level)) {
      return level as SeniorityLevel;
    }
    if (yearsExp < 1) return SeniorityLevel.INTERN;
    if (yearsExp < 3) return SeniorityLevel.JUNIOR;
    if (yearsExp < 6) return SeniorityLevel.MID;
    if (yearsExp < 10) return SeniorityLevel.SENIOR;
    if (yearsExp < 15) return SeniorityLevel.LEAD;
    return SeniorityLevel.PRINCIPAL;
  }
}
