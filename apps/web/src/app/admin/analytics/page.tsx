'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { ADMIN_SERIES, Panel, Segmented, compact, pct } from '@/components/admin/admin-ui';
import { BarList, DonutChart, Gauge, Histogram, TrendChart } from '@/components/admin/admin-charts';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.07] bg-black/20 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-72 animate-pulse rounded-lg border border-white/[0.09] bg-white/[0.04] ${i % 3 === 0 ? 'md:col-span-2' : ''}`} />
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch, isFetching } = useAdminAnalytics(days);

  const header = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{'//'} analytics</p>
        <p className="text-sm text-muted-foreground">Content, AI usage and quality over the selected period.</p>
      </div>
      <Segmented<number> value={days} onChange={setDays} options={[{ value: 7, label: '7d' }, { value: 30, label: '30d' }, { value: 90, label: '90d' }]} />
    </div>
  );

  if (!data && isLoading) return <div className="min-w-0">{header}<Skeleton /></div>;

  if (!data) {
    return (
      <div className="min-w-0">
        {header}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <span>Failed to load analytics{error ? '.' : ' (no data).'}</span>
          <button type="button" onClick={() => refetch()} className="btn-secondary inline-flex min-h-[40px] items-center gap-2 px-3 text-xs">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { ai, quality, distributions: dist } = data;
  const named = (xs: { name: string; calls: number }[]) => xs.map((x) => ({ name: x.name, value: x.calls }));
  const sec = quality.avgProcessingMs == null ? '–' : `${(quality.avgProcessingMs / 1000).toFixed(1)} s`;

  return (
    <div className="min-w-0">
      {header}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <span>Refresh failed, showing last data.</span>
          <button type="button" onClick={() => refetch()} className="underline">Retry</button>
        </div>
      )}
      <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-90' : ''}`}>
        <Panel title="Content pipeline" subtitle="Resumes, jobs and analyses per day" className="md:col-span-2">
          <TrendChart kind="bar" stacked data={data.daily} series={[
            { key: 'resumes', label: 'Resumes' }, { key: 'jobs', label: 'Jobs' }, { key: 'analyses', label: 'Analyses' },
          ]} />
        </Panel>

        <Panel title="AI usage" subtitle="Totals for the period">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Calls" value={compact(ai.calls)} />
            <Stat label="Success" value={pct(ai.successRate, 1)} />
            <Stat label="Avg latency" value={ai.avgLatencyMs == null ? '–' : `${Math.round(ai.avgLatencyMs)} ms`} />
            <Stat label="In / out tok" value={`${compact(ai.inputTokens)} / ${compact(ai.outputTokens)}`} />
          </div>
        </Panel>

        <Panel title="AI calls per day" className="md:col-span-1 xl:col-span-1">
          <TrendChart data={data.aiDaily} height={220} series={[{ key: 'calls', label: 'Calls' }]} />
        </Panel>
        <Panel title="AI tokens per day" className="xl:col-span-2">
          <TrendChart kind="line" data={data.aiDaily} height={220} valueFormatter={compact} series={[{ key: 'tokens', label: 'Tokens', color: ADMIN_SERIES[1] }]} />
        </Panel>

        <Panel title="AI by feature"><BarList data={named(ai.byFeature)} /></Panel>
        <Panel title="AI by model"><BarList data={named(ai.byModel)} color={ADMIN_SERIES[1]} /></Panel>
        <Panel title="Top skill gaps"><BarList data={data.topGapSkills} color={ADMIN_SERIES[3]} empty="No skill gaps yet" /></Panel>

        <Panel title="Match-score distribution" className="md:col-span-2">
          <Histogram data={quality.scoreHistogram} />
        </Panel>

        <Panel title="Quality">
          <div className="grid grid-cols-3 gap-1">
            <Gauge value={quality.avgMatchScore} label="Match" />
            <Gauge value={quality.avgAtsScore} label="ATS" color={ADMIN_SERIES[1]} />
            <Gauge value={quality.analysisSuccessRate == null ? null : quality.analysisSuccessRate * 100} label="Success" suffix="%" color={ADMIN_SERIES[2]} />
          </div>
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Avg processing <span className="text-foreground">{sec}</span>
          </p>
        </Panel>

        <Panel title="Sign-in providers"><DonutChart data={dist.usersByProvider} centerLabel="users" /></Panel>
        <Panel title="Users by role"><DonutChart data={dist.usersByRole} centerLabel="users" /></Panel>
        <Panel title="Resume status"><DonutChart data={dist.resumesByStatus} centerLabel="resumes" /></Panel>
        <Panel title="Analysis status"><DonutChart data={dist.analysesByStatus} centerLabel="analyses" /></Panel>
      </div>
    </div>
  );
}
