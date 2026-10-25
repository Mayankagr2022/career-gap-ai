'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, BarChart, ArrowUpRight, ArrowDownRight, Minus, Briefcase, Info } from 'lucide-react';
import { useMarketOverview, useMarketTrends, useSkillSearch } from '@/hooks/use-market';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import type { SkillMarketData } from '@career-gap-ai/shared';
import { TrendDirection } from '@career-gap-ai/shared';

export function MarketTrends() {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Market Trends</h1>
        <p className="mt-1 text-muted-foreground">Skill demand across the job descriptions added to CareerGap AI</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a skill (e.g., Python, React, AWS)..."
          className="input-field pl-12 h-14 text-base bg-card shadow-sm"
        />
      </div>

      {/* Why the list looks the way it does */}
      {!debouncedSearch && overview?.ready && !overview.trendHistory && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          <p>
            Skills are ranked by how many jobs mention them. Rising and declining arrows appear after about a week of
            history, once demand can be compared with last week.
          </p>
        </div>
      )}

      {/* Results */}
      <div>
        <h2 className="mb-4 font-semibold">{heading}</h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 shimmer rounded-2xl" />
            ))}
          </div>
        ) : displayData && displayData.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayData.map((item: SkillMarketData, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 hover:bg-foreground/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold">{item.skill}</h3>
                    <div className="mt-1 text-xs text-muted-foreground">{item.relatedSkills?.[0] || 'Technical Skill'}</div>
                  </div>
                  <div
                    title={item.trend === TrendDirection.RISING ? 'Rising' : item.trend === TrendDirection.DECLINING ? 'Declining' : 'Stable'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold',
                      item.trend === TrendDirection.RISING ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                      item.trend === TrendDirection.DECLINING ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                      'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {item.trend === TrendDirection.RISING ? <ArrowUpRight className="h-4 w-4" /> :
                     item.trend === TrendDirection.DECLINING ? <ArrowDownRight className="h-4 w-4" /> :
                     <Minus className="h-4 w-4" />}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Demand Score</span>
                      <span className="font-medium text-brand-400">{item.demandScore.toFixed(1)}/10</span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <div className="progress-fill" style={{ width: `${item.demandScore * 10}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-border pt-3">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Mentioned in
                    </div>
                    <div className="font-medium">{(item.jobCount || 0).toLocaleString()} jobs</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : debouncedSearch ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold">No skills found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center px-6 py-16 text-center">
            <BarChart className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold">No market data yet</p>
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
        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-6">
          <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <BarChart className="h-5 w-5 text-brand-500" />
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
