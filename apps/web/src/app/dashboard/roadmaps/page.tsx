'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, CheckCircle2, Circle, Clock, Target, Calendar, ChevronRight, ExternalLink } from 'lucide-react';
import { useRoadmaps, useUpdateRoadmapTask } from '@/hooks/use-roadmaps';
import { cn, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

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

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-6 text-left hover:bg-foreground/[0.02] transition-colors"
      >
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-400">
              <Target className="h-3 w-3" />
              {roadmap.targetRole}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {formatRelativeTime(roadmap.createdAt)}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold truncate">{roadmap.title}</h2>
          
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-1.5 flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-brand-400">{roadmap.completionPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${roadmap.completionPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 transition-transform duration-300", expanded && "rotate-90")}>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {/* Milestones Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-6 space-y-8">
              {roadmap.milestones?.map((milestone: any, index: number) => (
                <div key={milestone.id} className="relative">
                  {/* Timeline connector */}
                  {index !== roadmap.milestones.length - 1 && (
                    <div className="absolute left-[15px] top-[30px] bottom-[-40px] w-0.5 bg-border" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                      milestone.completed 
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" 
                        : "border-brand-500 bg-brand-500/10 text-brand-400"
                    )}>
                      {milestone.completed ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                    </div>
                    
                    <div className="flex-1 pb-4">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{milestone.title}</h3>
                        <span className="text-xs font-medium text-muted-foreground bg-foreground/5 px-2 py-1 rounded-md">Week {milestone.week}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{milestone.description}</p>
                      
                      {/* Tasks */}
                      <div className="space-y-2">
                        {milestone.tasks?.map((task: any) => (
                          <div 
                            key={task.id} 
                            className={cn(
                              "flex gap-3 rounded-xl border p-3 transition-colors",
                              task.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-foreground/[0.02] hover:bg-foreground/5"
                            )}
                          >
                            <button 
                              onClick={() => handleTaskToggle(milestone.id, task.id, task.completed)}
                              className="mt-0.5 flex shrink-0 items-start text-muted-foreground hover:text-brand-400"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground opacity-70")}>
                                {task.title}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                                {task.description}
                              </div>
                              {task.url && (
                                <a 
                                  href={task.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-brand-400 hover:text-brand-300"
                                >
                                  View Resource <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Career Roadmaps</h1>
        <p className="mt-1 text-muted-foreground">Your week-by-week action plans for career transition</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 shimmer rounded-2xl" />
          <div className="h-32 shimmer rounded-2xl" />
        </div>
      ) : roadmaps && roadmaps.length > 0 ? (
        <div className="space-y-6">
          {roadmaps.map((roadmap) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <Map className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-semibold">No roadmaps generated yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Run an analysis comparing your resume to a job description, and we'll automatically generate a customized roadmap for you.
          </p>
          <Link href="/dashboard/analyses" className="btn-primary mt-6 py-2.5 px-6 text-sm">
            Start Analysis
          </Link>
        </div>
      )}
    </div>
  );
}
