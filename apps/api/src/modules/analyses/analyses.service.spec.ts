import { BadRequestException, ForbiddenException, HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AnalysesService, MAX_ACTIVE_ANALYSES_PER_USER, STALE_ANALYSIS_MS } from './analyses.service';

function makeService(prisma: any) {
  return new AnalysesService(prisma, { add: jest.fn() } as any);
}

describe('AnalysesService (read paths)', () => {
  it('findAll selects summary fields only (no raw AI output, gaps or suggestions)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    await makeService({ analysis: { findMany } }).findAll('user-1');

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'user-1' });
    expect(args.include).toBeUndefined();
    expect(Object.keys(args.select)).toEqual(
      expect.arrayContaining(['id', 'status', 'matchScore', 'atsScore', 'createdAt', 'resume', 'job']),
    );
    for (const heavy of ['rawAnalysis', 'skillGaps', 'atsSuggestions', 'roadmaps', 'aiRecommendations']) {
      expect(args.select).not.toHaveProperty(heavy);
    }
  });

  describe('getStatus', () => {
    const row = { id: 'a1', userId: 'user-1', status: 'PROCESSING', errorMessage: null, updatedAt: new Date() };

    it('returns status without leaking the owner id', async () => {
      const findUnique = jest.fn().mockResolvedValue(row);
      const out = await makeService({ analysis: { findUnique } }).getStatus('a1', 'user-1');
      expect(out).toEqual({ id: 'a1', status: 'PROCESSING', errorMessage: null, updatedAt: row.updatedAt });
      expect(findUnique.mock.calls[0][0].include).toBeUndefined();
    });

    it('404s for a missing analysis', async () => {
      const svc = makeService({ analysis: { findUnique: jest.fn().mockResolvedValue(null) } });
      await expect(svc.getStatus('a1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it("403s for someone else's analysis", async () => {
      const svc = makeService({ analysis: { findUnique: jest.fn().mockResolvedValue(row) } });
      await expect(svc.getStatus('a1', 'other-user')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('delete checks ownership with the light query, then deletes', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'a1', userId: 'user-1', status: 'COMPLETED' });
    const del = jest.fn().mockResolvedValue({});
    const svc = makeService({ analysis: { findUnique, delete: del } });
    await expect(svc.delete('a1', 'user-1')).resolves.toEqual({ message: 'Analysis deleted' });
    expect(findUnique.mock.calls[0][0].include).toBeUndefined();
    expect(del).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });
});

describe('AnalysesService (queueing and stale runs)', () => {
  const resume = { id: 'r1', userId: 'user-1', status: 'ANALYZED' };
  const job = { id: 'j1', userId: 'user-1', isActive: true };

  function prismaForCreate() {
    return {
      resume: { findUnique: jest.fn().mockResolvedValue(resume) },
      job: { findUnique: jest.fn().mockResolvedValue(job) },
      analysis: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'a1' }), update: jest.fn().mockResolvedValue({}) },
    };
  }

  it('marks the analysis FAILED and reports unavailability when the queue is down', async () => {
    const prisma = prismaForCreate();
    const queue = { add: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const svc = new AnalysesService(prisma as any, queue as any);

    await expect(svc.create('user-1', 'r1', 'j1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.analysis.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: expect.objectContaining({ status: 'FAILED' }),
    });
  });

  it('returns the analysis when queueing works', async () => {
    const prisma = prismaForCreate();
    const svc = new AnalysesService(prisma as any, { add: jest.fn().mockResolvedValue({}) } as any);
    await expect(svc.create('user-1', 'r1', 'j1')).resolves.toEqual({ id: 'a1' });
    expect(prisma.analysis.update).not.toHaveBeenCalled();
  });

  it('failStale fails only PENDING/PROCESSING rows older than the threshold', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const svc = new AnalysesService({ analysis: { updateMany } } as any, {} as any);
    const now = Date.now();

    await expect(svc.failStale(now)).resolves.toBe(2);
    const { where, data } = updateMany.mock.calls[0][0];
    expect(where.status.in).toEqual(['PENDING', 'PROCESSING']);
    expect(where.updatedAt.lt.getTime()).toBe(now - STALE_ANALYSIS_MS);
    expect(data.status).toBe('FAILED');
  });
});

describe('AnalysesService (abuse limits)', () => {
  function setupActive(active: Array<{ resumeId: string; jobId: string }>) {
    const prisma = {
      resume: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', userId: 'user-1', status: 'ANALYZED' }) },
      job: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', userId: 'user-1', isActive: true }) },
      analysis: { findMany: jest.fn().mockResolvedValue(active), create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    };
    return { prisma, svc: new AnalysesService(prisma as any, { add: jest.fn() } as any) };
  }

  it('refuses to start the same resume/job pair while it is already running', async () => {
    const { svc, prisma } = setupActive([{ resumeId: 'r1', jobId: 'j1' }]);
    await expect(svc.create('user-1', 'r1', 'j1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.analysis.create).not.toHaveBeenCalled();
  });

  it('answers 429 once the user has the maximum number of analyses running', async () => {
    const active = Array.from({ length: MAX_ACTIVE_ANALYSES_PER_USER }, (_, i) => ({ resumeId: 'r' + (i + 10), jobId: 'j' + i }));
    const { svc, prisma } = setupActive(active);
    const err: HttpException = await svc.create('user-1', 'r1', 'j1').catch((e) => e);
    expect(err.getStatus()).toBe(429);
    expect(prisma.analysis.create).not.toHaveBeenCalled();
  });

  it('allows a new run below the limit', async () => {
    const { svc } = setupActive([{ resumeId: 'r9', jobId: 'j9' }]);
    await expect(svc.create('user-1', 'r1', 'j1')).resolves.toEqual({ id: 'a1' });
  });
});
