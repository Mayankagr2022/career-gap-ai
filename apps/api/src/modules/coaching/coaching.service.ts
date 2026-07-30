import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CareerCoachAgent, ChatMessage, CoachContext } from '../ai/agents/career-coach.agent';

@Injectable()
export class CoachingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coachAgent: CareerCoachAgent,
  ) {}

  async startSession(userId: string, message: string, analysisId?: string) {
    // Build context from latest analysis if available
    let context: CoachContext | undefined;

    if (analysisId) {
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
        include: {
          resume: { select: { parsedData: true } },
          job: { select: { title: true } },
        },
      });

      if (analysis) {
        const parsed = analysis.resume.parsedData as any;
        context = {
          resumeSummary: parsed ? `${parsed.name}, ${parsed.totalYearsExperience}y exp, skills: ${parsed.skills?.slice(0, 10).join(', ')}` : undefined,
          jobTitle: analysis.job.title,
          matchScore: analysis.matchScore ?? undefined,
          skillGaps: (analysis.skillGaps as any[])?.slice(0, 5).map((g: any) => g.skill) ?? [],
        };
      }
    }

    const messages: ChatMessage[] = [{ role: 'user', content: message }];
    const response = await this.coachAgent.chat(messages, context);

    // Save session
    const session = await this.prisma.coachingSession.create({
      data: {
        userId,
        messages: [
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: response, timestamp: new Date().toISOString() },
        ] as any,
        context: context as any,
        title: message.substring(0, 60),
      },
    });

    return { sessionId: session.id, response };
  }

  async continueSession(sessionId: string, userId: string, message: string) {
    const session = await this.prisma.coachingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');

    const history = session.messages as any[];
    const messages: ChatMessage[] = history.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
    messages.push({ role: 'user', content: message });

    const response = await this.coachAgent.chat(messages, session.context as any);

    // Update session with new messages
    const updatedMessages = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response, timestamp: new Date().toISOString() },
    ];

    await this.prisma.coachingSession.update({
      where: { id: sessionId },
      data: { messages: updatedMessages as any },
    });

    return { response };
  }

  async getSessions(userId: string) {
    return this.prisma.coachingSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.coachingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    return session;
  }

  async getInterviewQuestions(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');

    return this.coachAgent.generateInterviewQuestions(
      job.title,
      job.requiredSkills,
      job.experienceLevel || 'mid-level',
    );
  }

  async deleteSession(sessionId: string, userId: string) {
    await this.getSession(sessionId, userId);
    await this.prisma.coachingSession.delete({ where: { id: sessionId } });
    return { message: 'Session deleted' };
  }
}
