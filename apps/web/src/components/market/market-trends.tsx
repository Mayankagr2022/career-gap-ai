'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, BarChart as BarChartIcon, ArrowUpRight, ArrowDownRight, Minus, Briefcase, Info, TrendingUp, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMarketOverview, useMarketTrends, useSkillSearch } from '@/hooks/use-market';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import type { SkillMarketData } from '@career-gap-ai/shared';
import { TrendDirection } from '@career-gap-ai/shared';

function TrendBadge({ trend }: { trend: SkillMarketData['trend'] }) {
  const rising = trend === TrendDirection.RISING;
  const declining = trend === TrendDirection.DECLINING;
  return (
    <div
      title={rising ? 'Rising' : declining ? 'Declining' : 'Stable'}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold',
        rising ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_-4px_rgba(52,211,153,0.6)]'
          : declining ? 'border-red-400/30 bg-red-500/10 text-red-300'
          : 'border-white/10 bg-white/[0.05] text-muted-foreground',
      )}
    >
      {rising ? <ArrowUpRight className="h-4 w-4" /> : declining ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-popover px-3 py-2 text-xs shadow-xl">
      <div className="font-display text-sm font-semibold text-foreground">{row.skill}</div>
      <div className="mt-0.5 text-muted-foreground">
        <span className="font-medium text-brand-300">{row.jobCount.toLocaleString()}</span> jobs
      </div>
      <div className="text-muted-foreground">
        Demand <span className="font-medium text-brand-300">{row.demand.toFixed(1)}/10</span>
      </div>
    </div>
  );
}

function DemandChart({ data }: { data: SkillMarketData[] }) {
  const rows = data.slice(0, 8).map((s) => ({
    skill: s.skill,
    jobCount: s.jobCount || 0,
    demand: s.demandScore,
  }));
  if (rows.length < 2) return null;
  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold">Demand by skill</h3>
          <p className="text-xs text-muted-foreground">Number of jobs that mention each skill</p>
        </div>
      </div>
      <div className="h-72 w-full min-w-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="mkt-bar" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="60%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="skill"
              width={112}
              tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(250 14% 70%)', fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
            <Bar dataKey="jobCount" radius={[0, 10, 10, 0]} barSize={16} isAnimationActive animationDuration={700}>
              {rows.map((r) => (
                <Cell key={r.skill} fill="url(#mkt-bar)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MarketTrends({ standalone = false }: { standalone?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: trendingSkills, isLoading: isLoadingTrending } = useMarketTrends(12);
  const { data: searchResults, isLoading: isLoadingSearch } = useSkillSearch(debouncedSearch);
  const { data: overview } = useMarketOverview();

  const displayData = debouncedSearch ? searchResults : trendingSkills;
  const isLoading = debouncedSearch ? isLoadingSearch : isLoadingTrending;

  const hasRising = (trendingSkills ?? []).some((s: SkillMarketData) => s.trend === TrendDirection.RISING);
  const heading = debouncedSearch ? 'Search Results' : hasRising ? 'Trending Skills Now' : 'Most In-Demand Skills';
  const topSkill = trendingSkills?.[0] as SkillMarketData | undefined;
  const risingSkills = (trendingSkills ?? []).filter((s: SkillMarketData) => s.trend === TrendDirection.RISING).slice(0, 8);

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-2">
        <span className="eyebrow w-fit"><Flame className="h-3 w-3" /> Market pulse</span>
        {standalone && (
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Market <span className="gradient-text">Trends</span>
          </h1>
        )}
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Skill demand across the job descriptions added to CareerGap AI
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-300" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a skill (e.g., Python, React, AWS)..."
          className="input-field h-14 rounded-2xl pl-12 text-base"
        />
      </div>

      {/* Why the list looks the way it does */}
      {!debouncedSearch && overview?.ready && !overview.trendHistory && (
        <div className="flex items-start gap-3 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
          <p>
            Skills are ranked by how many jobs mention them. Rising and declining arrows appear after a day or so of
            history, once demand can be compared with earlier days. A skill only counts as rising or declining when its
            number of jobs changes by at least two, so small data sets stay calm.
          </p>
        </div>
      )}

      {/* Rising pills */}
      {!debouncedSearch && risingSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rising</span>
          {risingSkills.map((s: SkillMarketData, i: number) => (
            <motion.span
              key={s.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300"
            >
              <ArrowUpRight className="h-3 w-3" /> {s.skill}
            </motion.span>
          ))}
        </div>
      )}

      {/* Chart */}
      {!isLoading && displayData && displayData.length > 1 && <DemandChart data={displayData} />}

      {/* Results */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold">{heading}</h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 shimmer rounded-2xl" />
            ))}
          </div>
        ) : displayData && displayData.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayData.map((item: SkillMarketData, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.3 }}
                className="glass-card-hover min-w-0 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-xl font-bold">{item.skill}</h3>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{item.relatedSkills?.[0] || 'Technical Skill'}</div>
                  </div>
                  <TrendBadge trend={item.trend} />
                </div>

                <div className="mt-5 space-y-3">
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">Demand Score</span>
                      <span className="font-medium text-brand-300">{item.demandScore.toFixed(1)}/10</span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, item.demandScore * 10)}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + Math.min(i, 10) * 0.04, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Briefcase className="h-3 w-3" /> Mentioned in
                    </div>
                    <div className="font-medium">{(item.jobCount || 0).toLocaleString()} jobs</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : debouncedSearch ? (
          <div className="glass-card flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-brand-500/10">
              <Search className="h-8 w-8 text-brand-300" />
            </div>
            <p className="font-display text-lg font-semibold">No skills found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-brand-500/10">
              <BarChartIcon className="h-8 w-8 text-brand-300" />
            </div>
            <p className="font-display text-lg font-semibold">No market data yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {overview && !overview.ready
                ? `Skill demand is calculated from job descriptions and published once at least ${overview.minJobs} jobs have been added. There ${overview.activeJobs === 1 ? 'is' : 'are'} ${overview.activeJobs} so far.`
                : 'Add job descriptions and the skills they ask for will show up here.'}
            </p>
            <Link href="/dashboard/jobs" className="btn-primary mt-6 px-6 py-2.5 text-sm">
              Add a job
            </Link>
          </div>
        )}
      </div>

      {/* Summary computed from the data above (no hard-coded text) */}
      {overview?.ready && topSkill && !debouncedSearch && (
        <div className="relative overflow-hidden rounded-2xl border border-brand-400/25 bg-gradient-to-br from-brand-500/15 via-violet-500/10 to-transparent p-5 sm:p-6">
          <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <BarChartIcon className="h-5 w-5 text-brand-300" />
            At a glance
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Based on {overview.activeJobs} job descriptions and {overview.skillCount} distinct skills.{' '}
            <span className="font-medium text-foreground">{topSkill.skill}</span> is mentioned most, in{' '}
            {(topSkill.jobCount || 0).toLocaleString()} of them
            {topSkill.averageSalary ? `, with an average salary of about $${Math.round(topSkill.averageSalary).toLocaleString()}` : ''}.
          </p>
        </div>
      )}
    </div>
  );
}
