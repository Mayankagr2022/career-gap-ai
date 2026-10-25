import { AnalysisProcessor } from './analysis.processor';

function setup(opts: { attemptsMade?: number; failAfterCommit?: boolean } = {}) {
  const tx = {
    analysis: { update: jest.fn() },
    analysisSkillGap: { deleteMany: jest.fn(), createMany: jest.fn() },
    analysisAtsSuggestion: { deleteMany: jest.fn(), createMany: jest.fn() },
    recommendation: { deleteMany: jest.fn(), createMany: jest.fn() },
    roadmap: { deleteMany: jest.fn(), create: jest.fn() },
  };
  const prisma: any = {
    analysis: {
      update: jest.fn().mockResolvedValue({ userId: 'u1' }),
      findUnique: jest.fn().mockResolvedValue({
        userId: 'u1',
        resume: { parsedData: { skills: ['Node.js'], experience: [], education: [] }, rawText: 'text' },
        job: { title: 'Dev', company: 'Acme', remote: false, skills: [] },
      }),
    },
    $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
  };
  const gap = { analyze: jest.fn().mockResolvedValue({ matchScore: 70, skillGaps: [], atsSuggestions: [], fitAssessment: 'GOOD' }) };
  const rec = { generate: jest.fn().mockResolvedValue([]) };
  const road = { generate: jest.fn().mockResolvedValue({ title: 'R', targetRole: 'Dev', milestones: [] }) };
  const skills = { resolveMany: jest.fn().mockResolvedValue(new Map()) };
  const notifications = {
    notify: jest.fn().mockImplementation(() => (opts.failAfterCommit ? Promise.reject(new Error('boom')) : Promise.resolve())),
  };
  const processor = new AnalysisProcessor(prisma, gap as any, rec as any, road as any, skills as any, notifications as any);
  const job: any = { data: { analysisId: 'a1' }, attemptsMade: opts.attemptsMade ?? 0, opts: { attempts: 3 } };
  return { processor, prisma, tx, job, gap };
}

describe('AnalysisProcessor', () => {
  it('replaces recommendations and the roadmap on a re-run instead of duplicating them', async () => {
    const { processor, tx, job } = setup();
    await processor.handleAnalysis(job);
    expect(tx.recommendation.deleteMany).toHaveBeenCalledWith({ where: { analysisId: 'a1' } });
    expect(tx.roadmap.deleteMany).toHaveBeenCalledWith({ where: { analysisId: 'a1' } });
  });

  it('does not retry or mark a saved analysis FAILED when a step after the commit throws', async () => {
    const { processor, prisma, job } = setup({ failAfterCommit: true, attemptsMade: 2 });
    await expect(processor.handleAnalysis(job)).resolves.toBeUndefined();
    const statuses = prisma.analysis.update.mock.calls.map((c: any[]) => c[0].data.status);
    expect(statuses).not.toContain('FAILED');
  });

  it('still retries when the work itself fails before the commit', async () => {
    const { processor, gap, job } = setup();
    gap.analyze.mockRejectedValue(new Error('model down'));
    await expect(processor.handleAnalysis(job)).rejects.toThrow('model down');
  });
});
