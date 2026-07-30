'use client';

import Link from 'next/link';
import { Target, Plus, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { getScoreColor, getScoreLabel, formatRelativeTime } from '@/lib/utils';

export function LatestAnalysis() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get<any>('/users/stats'),
  });

  return (
    <div className="glass-card p-6 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Latest Analysis</h2>
        <Link href="/dashboard/analyses" className="text-xs text-brand-400 hover:text-brand-300">
          View all →
        </Link>
      </div>

      {statsLoading ? (
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-6">
            <div className="h-[90px] w-[90px] rounded-full shimmer" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-full rounded-md shimmer" />
              <div className="h-8 w-3/4 rounded-md shimmer" />
            </div>
          </div>
        </div>
      ) : stats?.latestAnalysis ? (
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            {/* Match score */}
            <div className="text-center">
              <div className={`font-display text-5xl font-bold ${getScoreColor(stats.latestAnalysis.matchScore)}`}>
                {Math.round(stats.latestAnalysis.matchScore)}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Match Score</div>
              <div className={`mt-1 text-xs font-medium ${getScoreColor(stats.latestAnalysis.matchScore)}`}>
                {getScoreLabel(stats.latestAnalysis.matchScore)}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Match Score</span>
                  <span className={getScoreColor(stats.latestAnalysis.matchScore)}>
                    {Math.round(stats.latestAnalysis.matchScore)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${stats.latestAnalysis.matchScore}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" /> ATS Score
                  </span>
                  <span className={getScoreColor(stats.latestAnalysis.atsScore)}>
                    {Math.round(stats.latestAnalysis.atsScore)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${stats.latestAnalysis.atsScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Analyzed {formatRelativeTime(stats.latestAnalysis.createdAt)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Target className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">No analysis yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a resume and add a job to get started
          </p>
          <Link href="/dashboard/analyses" className="btn-primary mt-4 py-2 px-4 text-sm">
            <Plus className="h-4 w-4" /> Start Analysis
          </Link>
        </div>
      )}
    </div>
  );
}
