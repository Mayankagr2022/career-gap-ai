import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnalysesService } from './analyses.service';

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
