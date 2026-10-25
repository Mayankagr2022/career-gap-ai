'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target, Plus, Zap, ArrowRight } from 'lucide-react';
import { useUserStats } from '@/hooks/use-user-stats';
import { getScoreColor, getScoreLabel, formatRelativeTime } from '@/lib/utils';
import { ScoreRing } from '../analyses/view/_components/score-ring';

export function LatestAnalysis() {
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const latest = stats?.latestAnalysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card glow-border relative min-w-0 overflow-hidden p-5 sm:p-6 lg:col-span-2"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative mb-4 flex items-center justify-between gap-3">
        <span className="eyebrow">Latest analysis</span>
        <Link href="/dashboard/analyses" className="inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {statsLoading ? (
        <div className="relative flex flex-col items-center gap-6 py-2 sm:flex-row">
          <div className="h-36 w-36 rounded-full shimmer" />
          <div className="w-full flex-1 space-y-4">
            <div className="h-8 w-full rounded-md shimmer" />
            <div className="h-8 w-3/4 rounded-md shimmer" />
          </div>
        </div>
      ) : latest ? (
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <ScoreRing score={latest.matchScore} label="Match Score" showLabel={false} />

          <div className="w-full min-w-0 flex-1 space-y-4">
            <div>
              <div className="font-display text-2xl font-bold sm:text-3xl">
                <span className={getScoreColor(latest.matchScore)}>{getScoreLabel(latest.matchScore)}</span>{' '}
                <span className="text-muted-foreground">match</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Analyzed {formatRelativeTime(latest.createdAt)}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">Match Score</span>
                  <span className={getScoreColor(latest.matchScore)}>{Math.round(latest.matchScore)}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${latest.matchScore}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3" /> ATS Score
                  </span>
                  <span className={getScoreColor(latest.atsScore)}>{Math.round(latest.atsScore)}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${latest.atsScore}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-brand-500/15">
            <Target className="h-8 w-8 text-brand-300" />
          </div>
          <p className="font-display text-lg font-semibold">No analysis yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Upload a resume and add a job to get started
          </p>
          <Link href="/dashboard/analyses" className="btn-primary mt-5 px-5 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Start Analysis
          </Link>
        </div>
      )}
    </motion.div>
  );
}
