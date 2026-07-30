'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function TrendingSkills() {
  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending-skills'],
    queryFn: () => api.get<any[]>('/market/trending?limit=6'),
  });

  return (
    <div className="glass-card p-6 min-w-0 overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Trending Skills</h2>
        <Link href="/dashboard/market" className="text-xs text-brand-400 hover:text-brand-300">
          View all →
        </Link>
      </div>

      {trendingLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-4 w-4 shrink-0 rounded shimmer" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 rounded shimmer" />
                  <div className="h-3 w-8 rounded shimmer" />
                </div>
                <div className="h-1.5 w-full rounded-full shimmer" />
              </div>
              <div className="h-3 w-6 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : trending ? (
        <div className="space-y-2">
          {trending.slice(0, 6).map((skill: any, i: number) => (
            <div key={skill.skill} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-xs text-muted-foreground/50 font-mono">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium truncate pr-2">{skill.skill}</span>
                  <span className="text-emerald-400 shrink-0 whitespace-nowrap">↑ {skill.trend}</span>
                </div>
                <div className="progress-bar h-1.5">
                  <div className="progress-fill" style={{ width: `${skill.demandScore * 10}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{skill.demandScore.toFixed(1)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
