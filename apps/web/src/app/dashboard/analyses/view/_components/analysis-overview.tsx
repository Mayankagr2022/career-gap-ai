'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { ScoreRing } from './score-ring';

export function AnalysisOverview({ analysis }: { analysis: any }) {
  const breakdown = analysis.rawAnalysis?.atsBreakdown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid gap-4 lg:grid-cols-5"
    >
      {/* Score hero */}
      <div className="glass-card glow-border relative overflow-hidden p-5 sm:p-6 lg:col-span-3">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative">
          <span className="eyebrow">
            <Sparkles className="h-3 w-3" /> Overview
          </span>
          <div className="mt-6 grid grid-cols-1 gap-8 min-[480px]:grid-cols-2">
            <ScoreRing score={analysis.matchScore} label="Match Score" />
            <div
              className="flex flex-col items-center gap-1"
              title="How well this resume would pass an applicant tracking system for this job: 40% resume format, 60% job keywords"
            >
              <ScoreRing score={analysis.atsScore} label="ATS Score" />
              {breakdown && (
                <p className="text-xs text-muted-foreground">
                  Format {breakdown.structure} · Keywords {breakdown.keyword ?? 'n/a'}
                </p>
              )}
            </div>
          </div>

          {analysis.rawAnalysis?.executiveSummary && (
            <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-500/[0.07] p-4">
              <p className="text-sm leading-relaxed text-foreground/85">{analysis.rawAnalysis.executiveSummary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Strengths / gaps */}
      <div className="grid gap-4 lg:col-span-2">
        <div className="glass-card min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <CheckCircle className="h-4 w-4" />
            </span>
            Strengths
          </div>
          <ul className="space-y-2">
            {(analysis.strengths || []).slice(0, 3).map((s: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="min-w-0 break-words">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15">
              <AlertTriangle className="h-4 w-4" />
            </span>
            Gaps
          </div>
          <ul className="space-y-2">
            {(analysis.weaknesses || []).slice(0, 3).map((w: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <span className="min-w-0 break-words">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
