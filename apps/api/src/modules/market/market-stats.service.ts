import { Injectable, Logger } from '@nestjs/common';
import { SkillTrend } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Below this many active jobs the shares are noise, so no stats are published. */
const MIN_JOBS = 5;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Ideal distance to compare against: a skill's demand now vs. about a week ago. */
const TREND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Trends start after one day of history; the closest snapshot to a week ago is used once there is more. */
const TREND_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const TREND_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Relative change in demandScore vs. the comparison snapshot that counts as rising/declining. */
const TREND_THRESHOLD = 0.1;
/** A move of a single job is noise in a small data set; require at least this many jobs of change. */
const MIN_TREND_JOB_DELTA = 2;

export interface TrendSample {
  demandScore: number;
  jobCount: number;
}

/**
 * Rising / declining / stable for one skill.
 *  - needs history: without any earlier snapshot nothing can be called a trend;
 *  - a skill with no earlier snapshot while the market has history is new, and compares against zero;
 *  - the change must be large relatively (share of jobs) and in absolute terms (number of jobs), so one extra job in a
 *    handful of postings, or the total simply growing, does not flip a skill.
 */
export function classifyTrend(current: TrendSample, previous: TrendSample | undefined, hasHistory: boolean): SkillTrend {
  if (!hasHistory) return SkillTrend.STABLE;
  const before = previous ?? { demandScore: 0, jobCount: 0 };

  const jobDelta = current.jobCount - before.jobCount;
  if (Math.abs(jobDelta) < MIN_TREND_JOB_DELTA) return SkillTrend.STABLE;

  const change = before.demandScore > 0 ? (current.demandScore - before.demandScore) / before.demandScore : Infinity;
  if (jobDelta > 0 && change >= TREND_THRESHOLD) return SkillTrend.RISING;
  if (jobDelta < 0 && change <= -TREND_THRESHOLD) return SkillTrend.DECLINING;
  return SkillTrend.STABLE;
}

/** For each skill, the snapshot taken closest to a week ago among those at least a day old. */
export function pickComparisonSnapshots<T extends { skillId: string; capturedAt: Date }>(snapshots: T[], now: number): Map<string, T> {
  const target = now - TREND_WINDOW_MS;
  const best = new Map<string, T>();
  for (const snapshot of snapshots) {
    const current = best.get(snapshot.skillId);
    if (!current || Math.abs(snapshot.capturedAt.getTime() - target) < Math.abs(current.capturedAt.getTime() - target)) {
      best.set(snapshot.skillId, snapshot);
    }
  }
  return best;
}
/** A company is only listed once at least this many jobs name it, so one user's entry is never exposed. */
const MIN_COMPANY_JOBS = 2;
const TOP_COMPANIES = 5;

const SOURCE = 'user-data';

export interface MarketOverview {
  /** Active jobs the stats are computed from. */
  activeJobs: number;
  /** Stats are only published from this many jobs, so one user's entry is never exposed. */
  minJobs: number;
  /** Whether enough jobs exist for any stats to be published. */
  ready: boolean;
  /** Whether a snapshot at least a day old exists, which is what "rising"/"declining" is measured against. */
  trendHistory: boolean;
  skillCount: number;
  lastUpdated: Date | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

interface SkillAgg {
  jobCount: number;
  salaries: number[];
  companies: Map<string, { name: string; count: number }>;
}

/**
 * Derives skill_market_stats from the jobs users have added: demand is the share of active jobs
 * that list a skill (scaled 0-10), salary is the mean midpoint of USD salary ranges, and trend
 * compares today's demand with the snapshot from at least a week ago.
 */
@Injectable()
export class MarketStatsService {
  private readonly logger = new Logger(MarketStatsService.name);
  private lastRun = 0;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Recompute at most every REFRESH_INTERVAL_MS; concurrent callers share one run. Never throws. */
  ensureFresh(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (Date.now() - this.lastRun < REFRESH_INTERVAL_MS) return Promise.resolve();

    this.inFlight = this.refresh()
      .catch((err) => this.logger.error(`Market stats refresh failed: ${err?.message ?? err}`))
      .finally(() => {
        this.lastRun = Date.now();
        this.inFlight = null;
      });
    return this.inFlight;
  }

  /** What the market screens need to explain themselves when there is little or no data yet. */
  async getOverview(): Promise<MarketOverview> {
    await this.ensureFresh();
    const [activeJobs, skillCount, oldSnapshots, latest] = await Promise.all([
      this.prisma.job.count({ where: { isActive: true } }),
      this.prisma.skillMarketStat.count(),
      this.prisma.skillMarketSnapshot.count({ where: { capturedAt: { lte: new Date(Date.now() - TREND_MIN_AGE_MS) } } }),
      this.prisma.skillMarketStat.aggregate({ _max: { lastUpdated: true } }),
    ]);
    return {
      activeJobs,
      minJobs: MIN_JOBS,
      ready: activeJobs >= MIN_JOBS,
      trendHistory: oldSnapshots > 0,
      skillCount,
      lastUpdated: latest._max.lastUpdated,
    };
  }

  private async refresh(): Promise<void> {
    const jobs = await this.prisma.job.findMany({
      where: { isActive: true },
      select: {
        company: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        skills: { select: { skillId: true } },
      },
    });

    if (jobs.length < MIN_JOBS) {
      await this.prisma.skillMarketStat.deleteMany({});
      return;
    }

    const agg = new Map<string, SkillAgg>();
    for (const job of jobs) {
      const salary = this.midpoint(job.salaryMin, job.salaryMax, job.salaryCurrency);
      const company = job.company?.trim();
      for (const { skillId } of job.skills) {
        let a = agg.get(skillId);
        if (!a) agg.set(skillId, (a = { jobCount: 0, salaries: [], companies: new Map() }));
        a.jobCount++;
        if (salary !== undefined) a.salaries.push(salary);
        if (company) {
          const key = company.toLowerCase();
          const c = a.companies.get(key);
          if (c) c.count++;
          else a.companies.set(key, { name: company, count: 1 });
        }
      }
    }

    const now = Date.now();
    const [old, recent] = await Promise.all([
      this.prisma.skillMarketSnapshot.findMany({
        where: { capturedAt: { lte: new Date(now - TREND_MIN_AGE_MS), gte: new Date(now - TREND_MAX_AGE_MS) } },
        select: { skillId: true, demandScore: true, jobCount: true, capturedAt: true },
      }),
      this.prisma.skillMarketSnapshot.findMany({
        where: { capturedAt: { gte: new Date(now - SNAPSHOT_INTERVAL_MS) } },
        select: { skillId: true },
      }),
    ]);
    const hasHistory = old.length > 0;
    const previous = pickComparisonSnapshots(old, now);
    const snapshotted = new Set(recent.map((s) => s.skillId));

    const upserts = [];
    const newSnapshots = [];
    for (const [skillId, a] of agg) {
      const demandScore = round1((a.jobCount / jobs.length) * 10);
      const averageSalary = a.salaries.length
        ? Math.round(a.salaries.reduce((x, y) => x + y, 0) / a.salaries.length)
        : null;
      const topCompanies = [...a.companies.values()]
        .filter((c) => c.count >= MIN_COMPANY_JOBS)
        .sort((x, y) => y.count - x.count)
        .slice(0, TOP_COMPANIES)
        .map((c) => c.name);

      const data = {
        demandScore,
        trend: classifyTrend({ demandScore, jobCount: a.jobCount }, previous.get(skillId), hasHistory),
        averageSalary,
        jobCount: a.jobCount,
        topCompanies,
        source: SOURCE,
        lastUpdated: new Date(now),
      };
      upserts.push(
        this.prisma.skillMarketStat.upsert({
          where: { skillId },
          update: data,
          create: { skillId, ...data },
        }),
      );
      if (!snapshotted.has(skillId)) {
        newSnapshots.push({ skillId, demandScore, averageSalary, jobCount: a.jobCount });
      }
    }

    await this.prisma.$transaction([
      ...upserts,
      this.prisma.skillMarketStat.deleteMany({ where: { skillId: { notIn: [...agg.keys()] } } }),
      this.prisma.skillMarketSnapshot.createMany({ data: newSnapshots }),
    ]);
  }

  /** Midpoint of a USD salary range (or the single bound given); undefined for other currencies. */
  private midpoint(min: number | null, max: number | null, currency: string | null): number | undefined {
    if (currency && currency.toUpperCase() !== 'USD') return undefined;
    if (min != null && max != null) return (min + max) / 2;
    return min ?? max ?? undefined;
  }
}
