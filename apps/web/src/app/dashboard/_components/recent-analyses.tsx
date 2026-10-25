'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRecentAnalyses } from '@/hooks/use-analyses';
import { Loader2, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { cn, getScoreColor, formatRelativeTime } from '@/lib/utils';

function MiniRing({ score }: { score: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score || 0));
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className={cn('relative text-xs font-bold', getScoreColor(score || 0))}>{Math.round(pct)}</span>
    </div>
  );
}

export function RecentAnalyses() {
  const { data: recentAnalyses = [], isLoading: analysesLoading } = useRecentAnalyses(3);

  return (
    <div className="glass-card min-w-0 overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Recent Analyses</h2>
        <Link href="/dashboard/analyses" className="inline-flex min-h-[40px] items-center text-xs font-medium text-brand-300 hover:text-brand-200">
          View all →
        </Link>
      </div>

      {analysesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3">
              <div className="h-12 w-12 shrink-0 rounded-full shimmer" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded shimmer" />
                <div className="h-3 w-1/2 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : recentAnalyses.length > 0 ? (
        <div className="space-y-2">
          {recentAnalyses.map((analysis, i) => (
            <motion.div
              key={analysis.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.07 }}
            >
              <Link
                href={`/dashboard/analyses/view?id=${analysis.id}`}
                className="group flex min-h-[64px] items-center gap-3 rounded-2xl border border-transparent p-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
              >
                {analysis.status === 'COMPLETED' ? (
                  <MiniRing score={analysis.matchScore} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground">
                    {analysis.status === 'PROCESSING' ? <Loader2 className="h-4 w-4 animate-spin text-brand-300" /> :
                     analysis.status === 'FAILED' ? <AlertCircle className="h-4 w-4 text-red-400" /> :
                     <Clock className="h-4 w-4" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {analysis.job?.title || 'Unknown Role'} @ {analysis.job?.company || ''}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {analysis.resume?.originalName || 'Resume'} • {formatRelativeTime(analysis.createdAt)}
                  </div>
                </div>
                <div className={cn(
                  'hidden shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide min-[400px]:block',
                  analysis.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                  analysis.status === 'PROCESSING' ? 'bg-brand-500/15 text-brand-300' :
                  analysis.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                  'bg-white/5 text-muted-foreground',
                )}>
                  {analysis.status}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No analyses yet</p>
      )}
    </div>
  );
}
