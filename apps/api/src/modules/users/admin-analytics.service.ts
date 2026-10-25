import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export const ANALYTICS_MIN_DAYS = 7;
export const ANALYTICS_MAX_DAYS = 90;

const clampDays = (days: number) => {
  if (!Number.isFinite(days)) return 30;
  return Math.min(ANALYTICS_MAX_DAYS, Math.max(ANALYTICS_MIN_DAYS, Math.trunc(days)));
};

/** Read-only aggregates for the admin dashboard. Everything here is derived from existing tables. */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(rawDays: number) {
    const days = clampDays(rawDays);
    const now = new Date();
    const since = new Date(now.getTime() - days * 86_400_000);
    const prevSince = new Date(since.getTime() - days * 86_400_000);

    const period = { gte: since };
    const previous = { gte: prevSince, lt: since };

    const [
      totals,
      periodCounts,
      prevCounts,
      usersByRole,
      usersByStatus,
      usersByProvider,
      analysesByStatus,
      resumesByStatus,
      scores,
      aiByFeature,
      aiByModel,
      aiTotals,
      topGaps,
      topUsers,
      daily,
      aiDaily,
      scoreBuckets,
      heat,
    ] = await Promise.all([
      this.totals(),
      this.countsSince(period),
      this.countsSince(previous),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['isActive'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['provider'], _count: { _all: true } }),
      this.prisma.analysis.groupBy({ by: ['status'], where: { createdAt: period }, _count: { _all: true } }),
      this.prisma.resume.groupBy({ by: ['status'], where: { createdAt: period }, _count: { _all: true } }),
      this.prisma.analysis.aggregate({
        where: { status: 'COMPLETED', createdAt: period },
        _avg: { matchScore: true, atsScore: true, processingTime: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { createdAt: period },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['model'],
        where: { createdAt: period },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: period },
        _count: { _all: true },
        _avg: { latencyMs: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.analysisSkillGap.groupBy({
        by: ['skillName'],
        where: { analysis: { createdAt: period } },
        _count: { _all: true },
        orderBy: { _count: { skillName: 'desc' } },
        take: 8,
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { analyses: { _count: 'desc' } },
        where: { analyses: { some: {} } },
        select: { id: true, name: true, email: true, role: true, _count: { select: { analyses: true, resumes: true } } },
      }),
      this.dailySeries(days),
      this.aiDailySeries(days),
      this.scoreHistogram(since),
      this.activityHeatmap(since),
    ]);

    const aiFailed = await this.prisma.aiUsageLog.count({ where: { createdAt: period, success: false } });
    const aiCalls = aiTotals._count._all;

    const completed = analysesByStatus.find((s) => s.status === 'COMPLETED')?._count._all ?? 0;
    const failed = analysesByStatus.find((s) => s.status === 'FAILED')?._count._all ?? 0;

    return {
      days,
      generatedAt: now.toISOString(),
      totals,
      period: periodCounts,
      previous: prevCounts,
      daily,
      aiDaily,
      distributions: {
        usersByRole: usersByRole.map((r) => ({ name: r.role, value: r._count._all })),
        usersByStatus: usersByStatus.map((r) => ({ name: r.isActive ? 'Active' : 'Suspended', value: r._count._all })),
        usersByProvider: usersByProvider.map((r) => ({ name: r.provider, value: r._count._all })),
        analysesByStatus: analysesByStatus.map((r) => ({ name: r.status, value: r._count._all })),
        resumesByStatus: resumesByStatus.map((r) => ({ name: r.status, value: r._count._all })),
      },
      quality: {
        avgMatchScore: scores._avg.matchScore,
        avgAtsScore: scores._avg.atsScore,
        avgProcessingMs: scores._avg.processingTime,
        analysisSuccessRate: completed + failed > 0 ? completed / (completed + failed) : null,
        scoreHistogram: scoreBuckets,
      },
      ai: {
        calls: aiCalls,
        failed: aiFailed,
        successRate: aiCalls > 0 ? (aiCalls - aiFailed) / aiCalls : null,
        avgLatencyMs: aiTotals._avg.latencyMs,
        inputTokens: aiTotals._sum.inputTokens ?? 0,
        outputTokens: aiTotals._sum.outputTokens ?? 0,
        byFeature: aiByFeature
          .map((f) => ({
            name: f.feature ?? 'other',
            calls: f._count._all,
            tokens: (f._sum.inputTokens ?? 0) + (f._sum.outputTokens ?? 0),
          }))
          .sort((a, b) => b.calls - a.calls),
        byModel: aiByModel
          .map((m) => ({
            name: m.model,
            calls: m._count._all,
            tokens: (m._sum.inputTokens ?? 0) + (m._sum.outputTokens ?? 0),
          }))
          .sort((a, b) => b.calls - a.calls),
      },
      topGapSkills: topGaps.map((g) => ({ name: g.skillName, value: g._count._all })),
      topUsers: topUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        analyses: u._count.analyses,
        resumes: u._count.resumes,
      })),
      heatmap: heat,
    };
  }

  /** Paged audit trail. `action` filters by prefix (e.g. "auth." or "admin."). */
  async getAuditLog(params: { limit: number; skip: number; action?: string }) {
    const limit = Math.min(100, Math.max(1, Math.trunc(params.limit) || 50));
    const skip = Math.max(0, Math.trunc(params.skip) || 0);
    const where: Prisma.AuditLogWhereInput = params.action ? { action: { startsWith: params.action } } : {};

    const [items, total, actions] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true }, orderBy: { _count: { action: 'desc' } }, take: 12 }),
    ]);

    return {
      items,
      total,
      limit,
      skip,
      actions: actions.map((a) => ({ name: a.action, value: a._count._all })),
    };
  }

  private async totals() {
    const [users, resumes, jobs, activeJobs, analyses, roadmaps, coachingSessions, skills] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.resume.count(),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { isActive: true } }),
      this.prisma.analysis.count(),
      this.prisma.roadmap.count(),
      this.prisma.coachingSession.count(),
      this.prisma.skill.count(),
    ]);
    return { users, resumes, jobs, activeJobs, analyses, roadmaps, coachingSessions, skills };
  }

  private async countsSince(createdAt: Prisma.DateTimeFilter) {
    const [users, resumes, jobs, analyses] = await Promise.all([
      this.prisma.user.count({ where: { createdAt } }),
      this.prisma.resume.count({ where: { createdAt } }),
      this.prisma.job.count({ where: { createdAt } }),
      this.prisma.analysis.count({ where: { createdAt } }),
    ]);
    return { users, resumes, jobs, analyses };
  }

  /** One row per day (zero-filled) so charts never have gaps. */
  private async dailySeries(days: number) {
    const rows = await this.prisma.$queryRaw<
      { day: string; users: number; resumes: number; jobs: number; analyses: number }[]
    >(Prisma.sql`
      WITH d AS (
        SELECT generate_series(current_date - (${days}::int - 1), current_date, interval '1 day')::date AS day
      ),
      u AS (SELECT "createdAt"::date AS day, count(*)::int AS c FROM users WHERE "createdAt" >= current_date - (${days}::int - 1) GROUP BY 1),
      r AS (SELECT "createdAt"::date AS day, count(*)::int AS c FROM resumes WHERE "createdAt" >= current_date - (${days}::int - 1) GROUP BY 1),
      j AS (SELECT "createdAt"::date AS day, count(*)::int AS c FROM jobs WHERE "createdAt" >= current_date - (${days}::int - 1) GROUP BY 1),
      a AS (SELECT "createdAt"::date AS day, count(*)::int AS c FROM analyses WHERE "createdAt" >= current_date - (${days}::int - 1) GROUP BY 1)
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             coalesce(u.c, 0) AS users, coalesce(r.c, 0) AS resumes,
             coalesce(j.c, 0) AS jobs, coalesce(a.c, 0) AS analyses
      FROM d
      LEFT JOIN u USING (day) LEFT JOIN r USING (day) LEFT JOIN j USING (day) LEFT JOIN a USING (day)
      ORDER BY d.day
    `);
    return rows.map((r) => ({ ...r }));
  }

  private async aiDailySeries(days: number) {
    const rows = await this.prisma.$queryRaw<
      { day: string; calls: number; tokens: number; failed: number }[]
    >(Prisma.sql`
      WITH d AS (
        SELECT generate_series(current_date - (${days}::int - 1), current_date, interval '1 day')::date AS day
      ),
      l AS (
        SELECT "createdAt"::date AS day,
               count(*)::int AS calls,
               coalesce(sum(coalesce("inputTokens", 0) + coalesce("outputTokens", 0)), 0)::float8 AS tokens,
               count(*) FILTER (WHERE NOT success)::int AS failed
        FROM ai_usage_logs
        WHERE "createdAt" >= current_date - (${days}::int - 1)
        GROUP BY 1
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             coalesce(l.calls, 0) AS calls, coalesce(l.tokens, 0) AS tokens, coalesce(l.failed, 0) AS failed
      FROM d LEFT JOIN l USING (day) ORDER BY d.day
    `);
    return rows.map((r) => ({ ...r }));
  }

  /** Completed analyses by match score, in buckets of 10 (0-9, 10-19 ... 90-100). */
  private async scoreHistogram(since: Date) {
    const rows = await this.prisma.$queryRaw<{ bucket: number; count: number }[]>(Prisma.sql`
      SELECT least(floor("matchScore" / 10), 9)::int AS bucket, count(*)::int AS count
      FROM analyses
      WHERE status = 'COMPLETED' AND "matchScore" IS NOT NULL AND "createdAt" >= ${since}
      GROUP BY 1
    `);
    return Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i === 9 ? 100 : i * 10 + 9}`,
      count: rows.find((r) => r.bucket === i)?.count ?? 0,
    }));
  }

  /** Audit events by weekday (0 = Sunday) and hour, for the activity heatmap. */
  private async activityHeatmap(since: Date) {
    const rows = await this.prisma.$queryRaw<{ dow: number; hr: number; c: number }[]>(Prisma.sql`
      SELECT extract(dow FROM "createdAt")::int AS dow, extract(hour FROM "createdAt")::int AS hr, count(*)::int AS c
      FROM audit_logs
      WHERE "createdAt" >= ${since}
      GROUP BY 1, 2
    `);
    return rows.map((r) => ({ day: r.dow, hour: r.hr, count: r.c }));
  }
}
