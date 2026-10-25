'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, AlertCircle, Lightbulb, Map, BarChart3, FileText, Clock
} from 'lucide-react';
import Link from 'next/link';
import { useAnalysis } from '@/hooks/use-analyses';
import { formatRelativeTime } from '@/lib/utils';
import { AnalysisOverview } from './_components/analysis-overview';
import { SkillGapsSection } from './_components/skill-gaps-section';
import { AtsSuggestionsSection } from './_components/ats-suggestions-section';

// The id is a query parameter (/dashboard/analyses/view?id=...), not a path segment: a statically exported site
// (GitHub Pages) cannot have a page for every analysis id.
function AnalysisDetail() {
  const id = useSearchParams().get('id') ?? '';
  const { data: analysis, isLoading } = useAnalysis(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 shimmer rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="h-72 shimmer rounded-2xl lg:col-span-3" />
          <div className="h-72 shimmer rounded-2xl lg:col-span-2" />
        </div>
        <div className="h-64 shimmer rounded-2xl" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="glass-card flex flex-col items-center px-4 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
          <AlertCircle className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="font-display text-lg font-semibold">Analysis not found</h2>
        <Link href="/dashboard/analyses" className="mt-4 btn-secondary py-2 px-4 text-sm">Go Back</Link>
      </div>
    );
  }

  const isProcessing = analysis.status === 'PROCESSING' || analysis.status === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 sm:gap-4"
      >
        <Link
          href="/dashboard/analyses"
          aria-label="Back to analyses"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-brand-400/40 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
            {analysis.job?.title} <span className="text-muted-foreground">@</span>{' '}
            <span className="gradient-text">{analysis.job?.company}</span>
          </h1>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{analysis.resume?.originalName}</span>
            <Clock className="ml-1 h-3.5 w-3.5 shrink-0" />
            <span className="shrink-0">{formatRelativeTime(analysis.createdAt)}</span>
          </p>
        </div>
      </motion.div>

      {/* Processing state */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center px-4 py-16 text-center"
        >
          <div className="relative mb-6">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-brand-500/20 border-t-brand-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-brand-300" />
            </div>
          </div>
          <h2 className="font-display text-xl font-semibold">AI Analysis in Progress</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Our AI is analyzing your resume against the job requirements. This typically takes 30-60 seconds.
          </p>
          <div className="mt-4 flex gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Auto-refreshing...
          </div>
        </motion.div>
      )}

      {/* Failed state */}
      {analysis.status === 'FAILED' && (
        <div className="glass-card flex flex-col items-center px-4 py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
            <AlertCircle className="h-8 w-8 text-rose-400" />
          </div>
          <h2 className="font-display text-lg font-semibold">Analysis Failed</h2>
          <p className="mt-1 max-w-md break-words text-sm text-muted-foreground">
            {analysis.errorMessage || 'Something went wrong. Please try creating a new analysis.'}
          </p>
        </div>
      )}

      {/* Completed analysis */}
      {analysis.status === 'COMPLETED' && (
        <>
          <AnalysisOverview analysis={analysis} />
          <SkillGapsSection analysis={analysis} />
          <AtsSuggestionsSection analysis={analysis} />

          {/* Recommendations & Roadmap links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/dashboard/recommendations" className="glass-card-hover group flex min-w-0 items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-glow">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold">View Recommendations</div>
                <div className="text-sm text-muted-foreground">
                  {analysis.aiRecommendations?.length || 0} personalized suggestions
                </div>
              </div>
              <ArrowLeft className="ml-auto h-4 w-4 shrink-0 rotate-180 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>

            <Link href="/dashboard/roadmaps" className="glass-card-hover group flex min-w-0 items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
                <Map className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold">Career Roadmap</div>
                <div className="text-sm text-muted-foreground">Your week-by-week plan</div>
              </div>
              <ArrowLeft className="ml-auto h-4 w-4 shrink-0 rotate-180 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalysisDetailPage() {
  return (
    <Suspense fallback={<div className="h-48 shimmer rounded-2xl" />}>
      <AnalysisDetail />
    </Suspense>
  );
}
