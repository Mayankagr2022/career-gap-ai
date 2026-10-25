'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot, Briefcase, Cpu, FileText, Gauge as GaugeIcon, RefreshCw, ScanSearch, Sparkles, UserPlus, Users, Zap,
} from 'lucide-react';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { useAdminStats } from '@/hooks/use-admin';
import { Kpi, Panel, PanelEmpty, Segmented, ADMIN_SERIES, compact, pct } from '@/components/admin/admin-ui';
import { BarList, DonutChart, Gauge, Heatmap, Histogram, TrendChart } from '@/components/admin/admin-charts';
import { cn } from '@/lib/utils';

const RANGES = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer h-[104px] rounded-lg border border-white/[0.06]" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-80 rounded-lg border border-white/[0.06] lg:col-span-2" />
        <div className="shimmer h-80 rounded-lg border border-white/[0.06]" />
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, isFetching, refetch } = useAdminAnalytics(days);
  const { data: stats } = useAdminStats();

  const sparks = useMemo(() => {
    const pick = (k: 'users' | 'resumes' | 'jobs' | 'analyses') => (data?.daily ?? []).map((d) => ({ v: d[k] }));
    return {
      users: pick('users'),
      resumes: pick('resumes'),
      jobs: pick('jobs'),
      analyses: pick('analyses'),
      calls: (data?.aiDaily ?? []).map((d) => ({ v: d.calls })),
      tokens: (data?.aiDaily ?? []).map((d) => ({ v: d.tokens })),
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{'//'} overview</p>
          <p className="text-sm text-muted-foreground">
            Live snapshot of growth, analysis quality and AI usage
            {data && <span className="font-mono text-xs"> · updated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented<number> options={RANGES} value={days} onChange={setDays} />
          <button
            onClick={() => refetch()}
            aria-label="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isLoading && <Skeleton />}

      {isError && !data && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-mono text-sm text-rose-300">Could not load analytics</p>
            <button onClick={() => refetch()} className="btn-secondary px-4 py-2 text-xs">Retry</button>
          </div>
        </Panel>
      )}

      {data && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Users" value={compact(data.totals.users)} icon={Users} color={ADMIN_SERIES[0]}
              delta={{ current: data.period.users, previous: data.previous.users }} spark={sparks.users} hint={`+${data.period.users} / ${days}d`} />
            <Kpi label="Resumes" value={compact(data.totals.resumes)} icon={FileText} color={ADMIN_SERIES[1]}
              delta={{ current: data.period.resumes, previous: data.previous.resumes }} spark={sparks.resumes} hint={`+${data.period.resumes} / ${days}d`} />
            <Kpi label="Active jobs" value={compact(data.totals.activeJobs)} icon={Briefcase} color={ADMIN_SERIES[2]}
              delta={{ current: data.period.jobs, previous: data.previous.jobs }} spark={sparks.jobs} hint={`${data.totals.jobs} total`} />
            <Kpi label="Analyses" value={compact(data.totals.analyses)} icon={ScanSearch} color={ADMIN_SERIES[3]}
              delta={{ current: data.period.analyses, previous: data.previous.analyses }} spark={sparks.analyses} hint={`+${data.period.analyses} / ${days}d`} />
            <Kpi label="Avg match" value={data.quality.avgMatchScore == null ? '–' : `${Math.round(data.quality.avgMatchScore)}%`} icon={GaugeIcon} color={ADMIN_SERIES[4]}
              hint={`ATS ${data.quality.avgAtsScore == null ? '–' : Math.round(data.quality.avgAtsScore)}`} />
            <Kpi label="AI calls" value={compact(data.ai.calls)} icon={Bot} color={ADMIN_SERIES[5]} spark={sparks.calls}
              hint={`${pct(data.ai.successRate)} ok`} />
            <Kpi label="Tokens" value={compact(data.ai.inputTokens + data.ai.outputTokens)} icon={Cpu} color={ADMIN_SERIES[0]} spark={sparks.tokens}
              hint={`${compact(data.ai.inputTokens)} in / ${compact(data.ai.outputTokens)} out`} />
            <Kpi label="AI latency" value={data.ai.avgLatencyMs == null ? '–' : `${(data.ai.avgLatencyMs / 1000).toFixed(1)}s`} icon={Zap} color={ADMIN_SERIES[1]}
              hint={`${data.ai.failed} failed`} />
          </div>

          {/* Platform ticker */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-white/[0.09] bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {[
              ['roadmaps', data.totals.roadmaps],
              ['coach sessions', data.totals.coachingSessions],
              ['skills catalog', data.totals.skills],
              ['jobs total', data.totals.jobs],
              ['analysis success', pct(data.quality.analysisSuccessRate)],
            ].map(([k, v]) => (
              <span key={String(k)}>{k} <b className="ml-1 font-semibold text-foreground">{v}</b></span>
            ))}
          </div>

          {/* Growth + users */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Growth" subtitle={`Signups and analyses per day, last ${days} days`} className="lg:col-span-2">
              <TrendChart
                data={data.daily}
                series={[
                  { key: 'users', label: 'Signups', color: ADMIN_SERIES[0] },
                  { key: 'analyses', label: 'Analyses', color: ADMIN_SERIES[1] },
                ]}
              />
            </Panel>
            <Panel title="Users" subtitle="Accounts by status">
              <DonutChart data={data.distributions.usersByStatus} colors={[ADMIN_SERIES[0], ADMIN_SERIES[3]]} centerLabel="users" />
            </Panel>
          </div>

          {/* Content + AI */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Content" subtitle="Resumes and jobs added per day">
              <TrendChart
                kind="bar"
                stacked
                height={240}
                data={data.daily}
                series={[
                  { key: 'resumes', label: 'Resumes', color: ADMIN_SERIES[2] },
                  { key: 'jobs', label: 'Jobs', color: ADMIN_SERIES[4] },
                ]}
              />
            </Panel>
            <Panel title="AI usage" subtitle="Model calls and tokens per day">
              <TrendChart
                kind="line"
                height={240}
                data={data.aiDaily}
                series={[
                  { key: 'calls', label: 'Calls', color: ADMIN_SERIES[5] },
                  { key: 'failed', label: 'Failed', color: ADMIN_SERIES[3] },
                ]}
              />
            </Panel>
          </div>

          {/* Quality */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Panel title="Quality" subtitle="Averages for completed analyses">
              <div className="flex flex-wrap items-start justify-around gap-4">
                <Gauge value={data.quality.avgMatchScore} label="Match" color={ADMIN_SERIES[0]} suffix="%" />
                <Gauge value={data.quality.avgAtsScore} label="ATS" color={ADMIN_SERIES[1]} suffix="%" />
                <Gauge value={data.quality.analysisSuccessRate == null ? null : data.quality.analysisSuccessRate * 100} label="Success" color={ADMIN_SERIES[2]} suffix="%" />
              </div>
              <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                avg processing {data.quality.avgProcessingMs == null ? '–' : `${(data.quality.avgProcessingMs / 1000).toFixed(1)}s`}
              </p>
            </Panel>
            <Panel title="Match scores" subtitle="Distribution of completed analyses">
              <Histogram data={data.quality.scoreHistogram} />
            </Panel>
            <Panel title="Analyses" subtitle="By status" className="md:col-span-2 xl:col-span-1">
              <DonutChart data={data.distributions.analysesByStatus} colors={[ADMIN_SERIES[0], ADMIN_SERIES[1], ADMIN_SERIES[2], ADMIN_SERIES[3]]} centerLabel="analyses" />
            </Panel>
          </div>

          {/* Heatmap + skill gaps */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Activity heatmap" subtitle="Audit events by weekday and hour" className="lg:col-span-2">
              <Heatmap cells={data.heatmap} />
            </Panel>
            <Panel title="Top skill gaps" subtitle="Most frequently missing skills">
              <BarList data={data.topGapSkills} color={ADMIN_SERIES[1]} empty="No skill gaps recorded yet" />
            </Panel>
          </div>

          {/* Feed, leaderboard, AI mix */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Live feed" subtitle="Latest signups and analyses" bodyClassName="p-0">
              {stats?.activities?.length ? (
                <ul className="divide-y divide-white/[0.06]">
                  {stats.activities.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md', a.type === 'NEW_USER' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300')}>
                        {a.type === 'NEW_USER' ? <UserPlus className="h-3.5 w-3.5" /> : <ScanSearch className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm leading-snug">{a.description}</p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatDistanceToNow(new Date(a.date), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-5"><PanelEmpty text="No activity yet" /></div>
              )}
            </Panel>

            <Panel title="Power users" subtitle="Most analyses run">
              {data.topUsers.length ? (
                <ol className="space-y-3">
                  {data.topUsers.map((u, i) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold', i === 0 ? 'bg-amber-400 text-black' : 'bg-white/[0.07] text-muted-foreground')}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                        <div>{u.analyses} <span className="text-muted-foreground">runs</span></div>
                        <div className="text-muted-foreground">{u.resumes} cv</div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <PanelEmpty text="No analyses run yet" />
              )}
            </Panel>

            <Panel title="AI by feature" subtitle="Calls per feature">
              <BarList
                data={data.ai.byFeature.map((f) => ({ name: f.name, value: f.calls }))}
                color={ADMIN_SERIES[5]}
                valueFormatter={(v) => `${v} calls`}
                empty="No AI calls logged yet"
              />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
