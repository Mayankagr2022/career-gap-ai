import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CoachContext {
  resumeSummary?: string;
  jobTitle?: string;
  matchScore?: number;
  skillGaps?: string[];
}

@Injectable()
export class CareerCoachAgent {
  private readonly logger = new Logger(CareerCoachAgent.name);

  constructor(private readonly ai: AiService) {}

  private buildSystemPrompt(context?: CoachContext): string {
    let systemPrompt = `You are CareerCoach AI, an expert career advisor with 20+ years helping professionals advance their careers.

Your expertise includes:
- Resume optimization and ATS strategies
- Interview preparation and techniques
- Career transitions and skill development planning
- Salary negotiation
- Personal branding and LinkedIn optimization
- Technical interview preparation
- Career gap navigation

Personality: Encouraging, specific, and actionable. Always give concrete advice, not generic platitudes.
Keep responses focused and concise (2-4 short paragraphs max unless a detailed plan is requested).

Format every reply as clean Markdown that is easy to scan in a chat window:
- Start with a one or two sentence direct answer, with no greeting or filler.
- Use short paragraphs. Use "-" bullet lists for options or tips and "1." numbered lists for sequential steps; keep each item to one or two lines and never nest lists more than one level.
- Use "###" headings only when the reply has several distinct parts. Never use "#" or "##".
- Use **bold** sparingly, for key terms or action items only.
- Put sample wording the user can reuse (an email, a reply to an interviewer, a headline) in a "> " blockquote.
- Do not use tables, HTML, horizontal rules, emojis or code blocks unless the user asks for code.
- Do not end with a generic offer to help further; end with at most one specific follow-up question.`;

    if (context) {
      systemPrompt += '\n\nUSER CONTEXT:';
      if (context.resumeSummary) systemPrompt += `\nResume: ${context.resumeSummary}`;
      if (context.jobTitle) systemPrompt += `\nTarget Role: ${context.jobTitle}`;
      if (context.matchScore !== undefined) systemPrompt += `\nJob Match Score: ${context.matchScore}%`;
      if (context.skillGaps?.length) systemPrompt += `\nKey Skill Gaps: ${context.skillGaps.join(', ')}`;
    }

    return systemPrompt;
  }

  async chat(
    messages: ChatMessage[],
    context?: CoachContext,
  ): Promise<string> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: this.buildSystemPrompt(context),
    };

    const response = await this.ai.chat(
      [systemMessage, ...messages] as any,
      { temperature: 0.7, maxTokens: 1500 },
    );

    return response;
  }

  async stream(
    messages: ChatMessage[],
    context: CoachContext | undefined,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: this.buildSystemPrompt(context),
    };

    await this.ai.stream([systemMessage, ...messages] as any, onChunk);
  }

  async generateInterviewQuestions(
    jobTitle: string,
    skills: string[],
    experience: string,
  ): Promise<{ question: string; category: string; tips: string }[]> {
    const prompt = `Generate 10 interview questions for a ${jobTitle} position.
Experience level: ${experience}
Key skills: ${skills.slice(0, 10).join(', ')}

Return JSON array:
[
  {
    "question": "the interview question",
    "category": "TECHNICAL|BEHAVIORAL|SITUATIONAL|CULTURE_FIT",
    "tips": "tips for answering this question well"
  }
]`;

    return this.ai.chatWithJson(
      [{ role: 'user', content: prompt }],
      { temperature: 0.6 },
    );
  }

  async optimizeResumeSection(
    section: string,
    jobDescription: string,
    currentContent: string,
  ): Promise<{ optimized: string; changes: string[] }> {
    const prompt = `Optimize this resume ${section} section for the given job description.

Job Description (excerpt):
${jobDescription.substring(0, 1500)}

Current ${section}:
${currentContent}

Optimize for:
1. ATS keyword matching
2. Quantified achievements
3. Action verbs
4. Relevance to job

Return JSON:
{
  "optimized": "the improved content",
  "changes": ["list of specific improvements made"]
}`;

    return this.ai.chatWithJson(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3 },
    );
  }
}
