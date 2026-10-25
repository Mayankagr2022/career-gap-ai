'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, CheckCircle2, Circle, ExternalLink,
  BookOpen, Code2, Award, Zap, Clock, Play, BarChart
} from 'lucide-react';
import { useRecommendations, useRecommendationStats, useMarkRecommendationComplete, useMarkRecommendationIncomplete } from '@/hooks/use-recommendations';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { CountUp } from '../analyses/view/_components/score-ring';

const TYPE_STYLES: Record<string, { icon: any; badge: string; tile: string; glow: string }> = {
  PROJECT: {
    icon: Code2,
    badge: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    tile: 'from-cyan-500 to-brand-500',
    glow: 'bg-cyan-400',
  },
  COURSE: {
    icon: BookOpen,
    badge: 'text-pink-300 bg-pink-500/10 border-pink-500/30',
    tile: 'from-pink-500 to-brand-500',
    glow: 'bg-pink-500',
  },
  CERTIFICATION: {
    icon: Award,
    badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    tile: 'from-emerald-500 to-cyan-400',
    glow: 'bg-emerald-400',
  },
};
const DEFAULT_STYLE = {
  icon: Lightbulb,
  badge: 'text-brand-200 bg-brand-500/10 border-brand-400/30',
  tile: 'from-brand-500 to-violet-500',
  glow: 'bg-brand-500',
};

function RecommendationCard({ rec, index }: { rec: any; index: number }) {
  const { mutate: markComplete } = useMarkRecommendationComplete();
  const { mutate: markIncomplete } = useMarkRecommendationIncomplete();

  const style = TYPE_STYLES[rec.type] || DEFAULT_STYLE;
  const Icon = style.icon;

  const toggleComplete = () => {
    if (rec.isCompleted) markIncomplete(rec.id);
    else markComplete(rec.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className={cn(
        'glass-card-hover relative flex min-w-0 flex-col overflow-hidden p-5',
        rec.isCompleted && 'opacity-60'
      )}
    >
      <div className={cn('pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-3xl', style.glow)} />

      <div className="relative flex items-start gap-3">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg', style.tile)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', style.badge)}>
              {rec.type}
            </span>
            {rec.difficulty && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {rec.difficulty}
              </span>
            )}
            {rec.cost && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {rec.cost}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={toggleComplete}
          aria-label={rec.isCompleted ? 'Mark as not done' : 'Mark as done'}
          className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-brand-300"
        >
          {rec.isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className="relative mt-4 min-w-0 flex-1">
        <h3 className={cn('break-words font-display text-lg font-semibold leading-tight', rec.isCompleted && 'text-muted-foreground line-through')}>
          {rec.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rec.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
          {rec.provider && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              {rec.provider}
            </div>
          )}
          {rec.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {rec.duration}
            </div>
          )}
          {rec.skills && rec.skills.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {rec.skills.slice(0, 2).join(', ')}
              {rec.skills.length > 2 && ` +${rec.skills.length - 2}`}
            </div>
          )}
        </div>
      </div>

      {rec.url && (
        <a
          href={rec.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-4 inline-flex min-h-[40px] w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-brand-200 transition-colors hover:border-brand-400/50 hover:bg-brand-500/15"
        >
          View Resource <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </motion.div>
  );
}

export default function RecommendationsPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const { data: recommendations, isLoading } = useRecommendations();
  const { data: stats } = useRecommendationStats();

  const filteredRecs = recommendations?.filter(r => {
    if (filter === 'ACTIVE') return !r.isCompleted;
    if (filter === 'COMPLETED') return r.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="eyebrow w-fit"><Lightbulb className="h-3 w-3" /> Recommendations</span>
        <p className="text-sm text-muted-foreground">AI-curated resources to close your skill gaps</p>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="glass-card glow-border relative col-span-2 overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative flex items-center gap-2 text-muted-foreground">
              <BarChart className="h-4 w-4" />
              <span className="text-sm font-medium">Completion Rate</span>
            </div>
            <div className="relative mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-emerald-400">
                <CountUp value={Number(stats.completionRate) || 0} />%
              </span>
              <span className="text-sm text-muted-foreground">({stats.completed}/{stats.total})</span>
            </div>
            <div className="progress-bar relative mt-3">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${stats.completionRate}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
          </div>

          {stats.byType.map((typeStats: any) => {
            const s = TYPE_STYLES[typeStats.type] || DEFAULT_STYLE;
            const TIcon = s.icon;
            return (
              <div key={typeStats.type} className="glass-card min-w-0 p-4 sm:p-5">
                <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br', s.tile)}>
                  <TIcon className="h-4 w-4 text-white" />
                </div>
                <div className="font-display text-2xl font-bold">
                  <CountUp value={typeStats.count} />
                </div>
                <div className="truncate text-xs font-medium text-muted-foreground">{typeStats.type}s</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'relative min-h-[40px] rounded-xl px-4 text-sm font-medium transition-colors',
              filter === f ? 'text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {filter === f && (
              <motion.span
                layoutId="rec-filter"
                transition={{ duration: 0.2 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/60 to-violet-500/40 shadow-glow"
              />
            )}
            <span className="relative">{f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'To Do' : 'Completed'}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 shimmer rounded-2xl" />
          ))}
        </div>
      ) : filteredRecs && filteredRecs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredRecs.map((rec, i) => (
              <RecommendationCard key={rec.id} rec={rec} index={i} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
            <Lightbulb className="h-8 w-8 text-brand-300" />
          </div>
          <p className="font-display font-semibold">No recommendations found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'COMPLETED' ? "You haven't completed any recommendations yet." : "Run an analysis to get personalized recommendations."}
          </p>
          {filter !== 'COMPLETED' && (
            <Link href="/dashboard/analyses" className="btn-primary mt-6 px-6 py-2.5 text-sm">
              <Play className="h-4 w-4" /> Start Analysis
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
