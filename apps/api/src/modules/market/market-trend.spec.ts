import { SkillTrend } from '@prisma/client';
import { classifyTrend, pickComparisonSnapshots } from './market-stats.service';

const day = 24 * 60 * 60 * 1000;

describe('classifyTrend', () => {
  it('calls nothing a trend while there is no history', () => {
    expect(classifyTrend({ demandScore: 8, jobCount: 8 }, undefined, false)).toBe(SkillTrend.STABLE);
  });

  it('flags a skill that gained jobs and share as rising, and one that lost them as declining', () => {
    expect(classifyTrend({ demandScore: 6, jobCount: 6 }, { demandScore: 3, jobCount: 3 }, true)).toBe(SkillTrend.RISING);
    expect(classifyTrend({ demandScore: 3, jobCount: 3 }, { demandScore: 6, jobCount: 6 }, true)).toBe(SkillTrend.DECLINING);
  });

  it('ignores a one-job change, which is noise in a small data set', () => {
    expect(classifyTrend({ demandScore: 6, jobCount: 3 }, { demandScore: 4, jobCount: 2 }, true)).toBe(SkillTrend.STABLE);
  });

  it('ignores a skill whose job count is unchanged while the total grew (its share fell)', () => {
    expect(classifyTrend({ demandScore: 2, jobCount: 4 }, { demandScore: 5, jobCount: 4 }, true)).toBe(SkillTrend.STABLE);
  });

  it('ignores a small relative change even with many jobs', () => {
    expect(classifyTrend({ demandScore: 5.2, jobCount: 52 }, { demandScore: 5, jobCount: 50 }, true)).toBe(SkillTrend.STABLE);
  });

  it('treats a skill that was absent before as rising once the market has history and it appears in enough jobs', () => {
    expect(classifyTrend({ demandScore: 4, jobCount: 3 }, undefined, true)).toBe(SkillTrend.RISING);
    expect(classifyTrend({ demandScore: 1, jobCount: 1 }, undefined, true)).toBe(SkillTrend.STABLE);
  });
});

describe('pickComparisonSnapshots', () => {
  const now = Date.UTC(2026, 9, 25);
  const snap = (skillId: string, daysAgo: number) => ({ skillId, capturedAt: new Date(now - daysAgo * day), id: skillId + daysAgo });

  it('uses the snapshot closest to a week ago for each skill', () => {
    const picked = pickComparisonSnapshots([snap('a', 1), snap('a', 6), snap('a', 12), snap('b', 2)], now);
    expect(picked.get('a')!.id).toBe('a6');
    expect(picked.get('b')!.id).toBe('b2'); // only one day or two of history: still comparable
  });

  it('returns nothing for a skill with no usable snapshot', () => {
    expect(pickComparisonSnapshots([], now).size).toBe(0);
  });
});
