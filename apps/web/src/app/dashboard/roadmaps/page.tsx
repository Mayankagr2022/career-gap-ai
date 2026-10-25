'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, CheckCircle2, Circle, Target, Calendar, ChevronRight, ExternalLink } from 'lucide-react';
import { useRoadmaps, useUpdateRoadmapTask } from '@/hooks/use-roadmaps';
import { cn, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import { CountUp } from '../analyses/view/_components/score-ring';

function RoadmapCard({ roadmap }: { roadmap: any }) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: updateTask } = useUpdateRoadmapTask();

  const handleTaskToggle = (milestoneId: string, taskId: string, currentCompleted: boolean) => {
    updateTask({
      roadmapId: roadmap.id,
      milestoneId,
      taskId,
      completed: !currentCompleted
    });
  };

  const pct = Math.max(0, Math.min(100, Number(roadmap.completionPct) || 0));
  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;
  const milestones: any[] = roadmap.milestones || [];
  const firstOpen = milestones.findIndex((m) => !m.completed);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.03] sm:p-6"
      >
        {/* Progress ring */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
            <defs>
              <linearGradient id={`rm-${roadmap.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <motion.circle
              cx="32" cy="32" r={ringR} fill="none"
              stroke={`url(#rm-${roadmap.id})`} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={ringC}
              initial={{ strokeDashoffset: ringC }}
              animate={{ strokeDashoffset: ringC - (pct / 100) * ringC }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <span className="relative font-display text-sm font-bold">
            <CountUp value={pct} />%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand-400/30 bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-200">
              <Target className="h-3 w-3 shrink-0" />
              <span className="truncate">{roadmap.targetRole}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Created {formatRelativeTime(roadmap.createdAt)}
            </span>
          </div>
          <h2 className="truncate font-display text-lg font-bold sm:text-xl">{roadmap.title}</h2>
          <div className="progress-bar mt-3 h-1.5">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] transition-transform duration-300', expanded && 'rotate-90')}>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {/* Milestones: vertical timeline */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-5 sm:p-6">
              {milestones.map((milestone: any, index: number) => {
                const isLast = index === milestones.length - 1;
                const current = index === firstOpen;
                return (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.05 }}
                    className="relative flex gap-3 sm:gap-4"
                  >
                    {/* Rail + node */}
                    <div className="relative flex w-9 shrink-0 justify-center">
                      {!isLast && (
                        <div
                          className={cn(
                            'absolute bottom-0 top-9 w-0.5 rounded-full',
                            milestone.completed
                              ? 'bg-gradient-to-b from-emerald-400 to-emerald-400/30'
                              : 'bg-white/10'
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold',
                          milestone.completed
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_18px_hsl(150_80%_45%/0.55)]'
                            : current
                              ? 'border-brand-400 bg-brand-500/25 text-brand-100 shadow-glow animate-pulse-ring'
                              : 'border-white/15 bg-card text-muted-foreground'
                        )}
                      >
                        {milestone.completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 pb-8">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="min-w-0 break-words font-display text-base font-semibold sm:text-lg">{milestone.title}</h3>
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          Week {milestone.week}
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-muted-foreground">{milestone.description}</p>

                      {/* Tasks */}
                      <div className="space-y-2">
                        {milestone.tasks?.map((task: any) => (
                          <div
                            key={task.id}
                            className={cn(
                              'flex min-w-0 gap-1 rounded-2xl border p-2 pr-3 transition-colors',
                              task.completed ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                            )}
                          >
                            <button
                              onClick={() => handleTaskToggle(milestone.id, task.id, task.completed)}
                              aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-brand-300"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1 py-2">
                              <div className={cn('break-words text-sm font-medium', task.completed && 'text-muted-foreground line-through opacity-70')}>
                                {task.title}
                              </div>
                              <div className="mt-1 break-words text-xs leading-relaxed text-muted-foreground/80">
                                {task.description}
                              </div>
                              {task.url && (
                                <a
                                  href={task.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-200"
                                >
                                  View Resource <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RoadmapsPage() {
  const { data: roadmaps, isLoading } = useRoadmaps();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="eyebrow w-fit"><Map className="h-3 w-3" /> Roadmaps</span>
        <p className="text-sm text-muted-foreground">Your week-by-week action plans for career transition</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 shimmer rounded-2xl" />
          <div className="h-32 shimmer rounded-2xl" />
        </div>
      ) : roadmaps && roadmaps.length > 0 ? (
        <div className="space-y-5">
          {roadmaps.map((roadmap, i) => (
            <motion.div
              key={roadmap.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.06 }}
            >
              <RoadmapCard roadmap={roadmap} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-brand-500/10">
            <Map className="h-8 w-8 text-brand-300" />
          </div>
          <p className="font-display font-semibold">No roadmaps generated yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Run an analysis comparing your resume to a job description, and we'll automatically generate a customized roadmap for you.
          </p>
          <Link href="/dashboard/analyses" className="btn-primary mt-6 px-6 py-2.5 text-sm">
            Start Analysis
          </Link>
        </div>
      )}
    </div>
  );
}
