import { SkillTrend } from '@prisma/client';
import { MarketService } from './market.service';

const stat = (id: string, name: string, trend: SkillTrend, demandScore: number) => ({
  id,
  trend,
  demandScore,
  jobCount: demandScore,
  skillId: `s-${id}`,
  source: 'user-data',
  skill: { name, relatedTo: [] },
});

function makeService(findMany: jest.Mock) {
  const marketStats = { ensureFresh: jest.fn().mockResolvedValue(undefined), getOverview: jest.fn() };
  const svc = new MarketService({ skillMarketStat: { findMany } } as any, {} as any, marketStats as any);
  return { svc, marketStats };
}

describe('MarketService.getTrendingSkills', () => {
  it('returns only rising skills when there are enough of them', async () => {
    const findMany = jest.fn().mockResolvedValue([stat('1', 'Rust', SkillTrend.RISING, 6), stat('2', 'Go', SkillTrend.RISING, 5)]);
    const out = await makeService(findMany).svc.getTrendingSkills(2);

    expect(out.map((s) => s.skill)).toEqual(['Rust', 'Go']);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('tops the list up with the most in-demand skills while history is missing, keeping their real trend', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([stat('1', 'Rust', SkillTrend.RISING, 6)]) // rising
      .mockResolvedValueOnce([stat('2', 'React', SkillTrend.STABLE, 8), stat('3', 'SQL', SkillTrend.DECLINING, 7)]); // top-up
    const out = await makeService(findMany).svc.getTrendingSkills(3);

    expect(out.map((s) => [s.skill, s.trend])).toEqual([
      ['Rust', SkillTrend.RISING],
      ['React', SkillTrend.STABLE],
      ['SQL', SkillTrend.DECLINING],
    ]);
    const topUp = findMany.mock.calls[1][0];
    expect(topUp.where).toEqual({ trend: { not: SkillTrend.RISING } });
    expect(topUp.take).toBe(2); // only what is missing
    expect(topUp.orderBy[0]).toEqual({ demandScore: 'desc' });
  });

  it('returns a stable list (not an empty one) when nothing is rising yet', async () => {
    const findMany = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([stat('1', 'React', SkillTrend.STABLE, 8)]);
    const out = await makeService(findMany).svc.getTrendingSkills(10);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ skill: 'React', trend: SkillTrend.STABLE });
  });

  it('delegates the overview to the stats service', async () => {
    const { svc, marketStats } = makeService(jest.fn());
    marketStats.getOverview.mockResolvedValue({ activeJobs: 3, ready: false });
    await expect(svc.getOverview()).resolves.toEqual({ activeJobs: 3, ready: false });
  });
});
