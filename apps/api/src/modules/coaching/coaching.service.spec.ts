import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { CoachingService } from './coaching.service';

const msg = (role: ChatRole, content: string) => ({ role, content, createdAt: new Date() });

describe('CoachingService', () => {
  it('continueSession replays only the newest messages, oldest first, then the new user message', async () => {
    // Prisma returns newest-first when asked for "desc"; the service must restore chronological order
    const newestFirst = [msg(ChatRole.ASSISTANT, 'a2'), msg(ChatRole.USER, 'u2'), msg(ChatRole.ASSISTANT, 'a1')];
    const findUnique = jest.fn().mockResolvedValue({ id: 's1', userId: 'user-1', context: { jobTitle: 'Dev' }, messages: newestFirst });
    const update = jest.fn().mockResolvedValue({});
    const chat = jest.fn().mockResolvedValue('reply');
    const svc = new CoachingService({ coachingSession: { findUnique, update } } as any, { chat } as any);

    await expect(svc.continueSession('s1', 'user-1', 'next?')).resolves.toEqual({ response: 'reply' });

    const include = findUnique.mock.calls[0][0].include.messages;
    expect(include).toMatchObject({ orderBy: { createdAt: 'desc' }, take: 20 });
    expect(chat.mock.calls[0][0]).toEqual([
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
      { role: 'user', content: 'next?' },
    ]);
    expect(chat.mock.calls[0][1]).toEqual({ jobTitle: 'Dev' });
  });

  it('getSessions is bounded and selects list fields only', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    await new CoachingService({ coachingSession: { findMany } } as any, {} as any).getSessions('user-1');
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
    expect(args.include).toBeUndefined();
    expect(Object.keys(args.select).sort()).toEqual(['createdAt', 'id', 'title', 'updatedAt']);
  });

  describe('deleteSession', () => {
    it('checks ownership without loading the transcript, then deletes', async () => {
      const findUnique = jest.fn().mockResolvedValue({ userId: 'user-1' });
      const del = jest.fn().mockResolvedValue({});
      const svc = new CoachingService({ coachingSession: { findUnique, delete: del } } as any, {} as any);

      await expect(svc.deleteSession('s1', 'user-1')).resolves.toEqual({ message: 'Session deleted' });
      expect(findUnique.mock.calls[0][0]).toEqual({ where: { id: 's1' }, select: { userId: true } });
      expect(del).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('404s when missing and 403s for another user without deleting', async () => {
      const del = jest.fn();
      const missing = new CoachingService({ coachingSession: { findUnique: jest.fn().mockResolvedValue(null), delete: del } } as any, {} as any);
      await expect(missing.deleteSession('s1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);

      const foreign = new CoachingService({ coachingSession: { findUnique: jest.fn().mockResolvedValue({ userId: 'other' }), delete: del } } as any, {} as any);
      await expect(foreign.deleteSession('s1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(del).not.toHaveBeenCalled();
    });
  });
});
