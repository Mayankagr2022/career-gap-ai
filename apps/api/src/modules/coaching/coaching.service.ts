import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CareerCoachAgent, ChatMessage, CoachContext } from '../ai/agents/career-coach.agent';

const toApiRole = (role: ChatRole): 'user' | 'assistant' =>
  role === ChatRole.USER ? 'user' : 'assistant';

/** How much conversation history is replayed to the model on each message. */
const CONTEXT_MESSAGES = 20;

/** One user/assistant exchange; explicit timestamps keep the order stable (now() ties inside a transaction). */
function turn(userMessage: string, assistantMessage: string) {
  const now = Date.now();
  return [
    { role: ChatRole.USER, content: userMessage, createdAt: new Date(now) },
    { role: ChatRole.ASSISTANT, content: assistantMessage, createdAt: new Date(now + 1) },
  ];
}

@Injectable()
export class CoachingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coachAgent: CareerCoachAgent,
  ) {}

  async startSession(userId: string, message: string, analysisId?: string) {
    // Build context from the analysis if one was given (it must belong to the caller)
    let context: CoachContext | undefined;
    let linkedAnalysisId: string | undefined;

    if (analysisId) {
      const analysis = await this.prisma.analysis.findFirst({
        where: { id: analysisId, userId },
        include: {
          resume: { select: { parsedData: true } },
          job: { select: { title: true } },
          skillGaps: { take: 5, orderBy: { requiredLevel: 'desc' }, select: { skillName: true } },
        },
      });

      if (analysis) {
        linkedAnalysisId = analysis.id;
        const parsed = analysis.resume.parsedData as any;
        context = {
          resumeSummary: parsed
            ? `${parsed.name}, ${parsed.totalYearsExperience}y exp, skills: ${parsed.skills?.slice(0, 10).join(', ')}`
            : undefined,
          jobTitle: analysis.job.title,
          matchScore: analysis.matchScore ?? undefined,
          skillGaps: analysis.skillGaps.map((g) => g.skillName),
        };
      }
    }

    const messages: ChatMessage[] = [{ role: 'user', content: message }];
    const response = await this.coachAgent.chat(messages, context);

    const session = await this.prisma.coachingSession.create({
      data: {
        userId,
        analysisId: linkedAnalysisId,
        context: context as any,
        title: message.substring(0, 60),
        messages: {
          create: turn(message, response),
        },
      },
    });

    return { sessionId: session.id, response };
  }

  async continueSession(sessionId: string, userId: string, message: string) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: CONTEXT_MESSAGES } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');

    // Newest N messages, restored to chronological order
    const messages: ChatMessage[] = session.messages
      .reverse()
      .map((m) => ({ role: toApiRole(m.role), content: m.content }));
    messages.push({ role: 'user', content: message });

    const response = await this.coachAgent.chat(messages, session.context as any);

    // Append the new turn (bumps updatedAt so the session sorts to the top)
    await this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: {
        messages: {
          create: turn(message, response),
        },
      },
    });

    return { response };
  }

  async getSessions(userId: string) {
    return this.prisma.coachingSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.coachingSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');

    return {
      ...session,
      messages: session.messages.map((m) => ({
        role: toApiRole(m.role),
        content: m.content,
        timestamp: m.createdAt.toISOString(),
      })),
    };
  }

  async getInterviewQuestions(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { skills: { where: { importance: 'REQUIRED' }, include: { skill: { select: { name: true } } } } },
    });
    if (!job || !job.isActive) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');

    return this.coachAgent.generateInterviewQuestions(
      job.title,
      job.skills.map((s) => s.skill.name),
      job.experienceLevel || 'mid-level',
    );
  }

  async deleteSession(sessionId: string, userId: string) {
    // Ownership check only; no need to load the transcript
    const session = await this.prisma.coachingSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    await this.prisma.coachingSession.delete({ where: { id: sessionId } });
    return { message: 'Session deleted' };
  }
}
