'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMarketTrends } from '@/hooks/use-market';

export function TrendingSkills() {
  const { data: trending, isLoading: trendingLoading } = useMarketTrends(6);
  const hasRising = (trending ?? []).some((s: any) => s.trend === 'RISING');

  return (
    <div className="glass-card min-w-0 overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{hasRising ? 'Trending Skills' : 'Top Skills in Demand'}</h2>
        <Link href="/dashboard/market" className="inline-flex min-h-[40px] items-center text-xs font-medium text-brand-300 hover:text-brand-200">
          View all →
        </Link>
      </div>

      {trendingLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-6 w-6 shrink-0 rounded-lg shimmer" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 rounded shimmer" />
                  <div className="h-3 w-8 rounded shimmer" />
                </div>
                <div className="h-1.5 w-full rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : trending && trending.length > 0 ? (
        <div className="space-y-3.5">
          {trending.slice(0, 6).map((skill: any, i: number) => (
            <div key={skill.skill} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="truncate pr-2 text-sm font-medium">{skill.skill}</span>
                  {skill.trend === 'RISING' ? (
                    <span className="shrink-0 whitespace-nowrap text-emerald-400">↑ Rising</span>
                  ) : skill.trend === 'DECLINING' ? (
                    <span className="shrink-0 whitespace-nowrap text-red-400">↓ Declining</span>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap text-muted-foreground">{skill.jobCount} {skill.jobCount === 1 ? 'job' : 'jobs'}</span>
                  )}
                </div>
                <div className="progress-bar h-1.5">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.demandScore * 10}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 }}
                  />
                </div>
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">{skill.demandScore.toFixed(1)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Add at least 5 jobs to see which skills are in demand.
        </p>
      )}
    </div>
  );
}
