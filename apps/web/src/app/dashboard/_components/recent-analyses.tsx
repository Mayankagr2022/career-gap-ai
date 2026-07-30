'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn, getScoreColor, formatRelativeTime } from '@/lib/utils';

export function RecentAnalyses() {
  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => api.get<any[]>('/analyses'),
  });

  const recentAnalyses = analyses?.slice(0, 3) || [];

  return (
    <div className="glass-card p-6 min-w-0 overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Recent Analyses</h2>
        <Link href="/dashboard/analyses" className="text-xs text-brand-400 hover:text-brand-300">
          View all →
        </Link>
      </div>

      {analysesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3">
              <div className="h-10 w-10 shrink-0 rounded-xl shimmer" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded shimmer" />
                <div className="h-3 w-1/2 rounded shimmer" />
              </div>
              <div className="h-5 w-16 rounded-full shimmer" />
            </div>
          ))}
        </div>
      ) : recentAnalyses.length > 0 ? (
        <div className="space-y-3">
          {recentAnalyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/dashboard/analyses/${analysis.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-foreground/5"
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                analysis.status === 'COMPLETED' ? getScoreColor(analysis.matchScore || 0) : 'text-muted-foreground',
                analysis.status === 'COMPLETED' ? 'bg-foreground/5' : 'bg-muted',
              )}>
                {analysis.status === 'COMPLETED' ? `${Math.round(analysis.matchScore)}%` :
                 analysis.status === 'PROCESSING' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                 analysis.status === 'FAILED' ? <AlertCircle className="h-4 w-4" /> :
                 <Clock className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {analysis.job?.title || 'Unknown Role'} @ {analysis.job?.company || ''}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {analysis.resume?.originalName || 'Resume'} • {formatRelativeTime(analysis.createdAt)}
                </div>
              </div>
              <div className={cn(
                'text-xs rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap',
                analysis.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                analysis.status === 'PROCESSING' ? 'bg-brand-500/10 text-brand-400' :
                analysis.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                'bg-muted text-muted-foreground',
              )}>
                {analysis.status}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No analyses yet</p>
      )}
    </div>
  );
}
