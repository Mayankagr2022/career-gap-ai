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

function RecommendationCard({ rec }: { rec: any }) {
  const { mutate: markComplete } = useMarkRecommendationComplete();
  const { mutate: markIncomplete } = useMarkRecommendationIncomplete();

  const Icon = {
    PROJECT: Code2,
    COURSE: BookOpen,
    CERTIFICATION: Award,
  }[rec.type] || Lightbulb;

  const colorClass = {
    PROJECT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    COURSE: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    CERTIFICATION: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }[rec.type] || 'text-brand-400 bg-brand-500/10 border-brand-500/20';

  const toggleComplete = () => {
    if (rec.isCompleted) markIncomplete(rec.id);
    else markComplete(rec.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card-hover relative overflow-hidden p-5',
        rec.isCompleted && 'opacity-60 grayscale-[0.5]'
      )}
    >
      {/* Decorative background element */}
      <div className={cn(
        'absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl',
        colorClass.replace('border', 'bg').split(' ')[1]
      )} />

      <div className="relative flex gap-4">
        <button
          onClick={toggleComplete}
          className="mt-1 flex shrink-0 items-start text-muted-foreground hover:text-brand-400 transition-colors"
        >
          {rec.isCompleted ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', colorClass)}>
              <Icon className="h-3 w-3" />
              {rec.type}
            </span>
            {rec.difficulty && (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {rec.difficulty}
              </span>
            )}
            {rec.cost && (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {rec.cost}
              </span>
            )}
          </div>

          <h3 className={cn('text-lg font-semibold leading-tight', rec.isCompleted && 'line-through text-muted-foreground')}>
            {rec.title}
          </h3>
          
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {rec.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
            {rec.provider && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
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

          {rec.url && (
            <a
              href={rec.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground/5 px-4 py-2 text-sm font-medium text-brand-300 hover:bg-foreground/10 hover:text-brand-400 transition-colors"
            >
              View Resource <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Recommendations</h1>
        <p className="mt-1 text-muted-foreground">AI-curated resources to close your skill gaps</p>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart className="h-4 w-4" />
              <span className="text-sm font-medium">Completion Rate</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-emerald-400">{stats.completionRate}%</span>
              <span className="text-sm text-muted-foreground">({stats.completed}/{stats.total})</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          
          {stats.byType.map((typeStats: any) => (
            <div key={typeStats.type} className="glass-card p-5">
              <div className="text-sm font-medium text-muted-foreground">{typeStats.type}s</div>
              <div className="mt-2 font-display text-2xl font-bold">{typeStats.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-border pb-4">
        {['ALL', 'ACTIVE', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              filter === f ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
            )}
          >
            {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'To Do' : 'Completed'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 shimmer rounded-2xl" />
          ))}
        </div>
      ) : filteredRecs && filteredRecs.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredRecs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-semibold">No recommendations found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'COMPLETED' ? "You haven't completed any recommendations yet." : "Run an analysis to get personalized recommendations."}
          </p>
          {filter !== 'COMPLETED' && (
            <Link href="/dashboard/analyses" className="btn-primary mt-6 py-2.5 px-6 text-sm">
              <Play className="h-4 w-4" /> Start Analysis
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
