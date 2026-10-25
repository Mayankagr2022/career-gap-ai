'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, AlertCircle, Lightbulb, Map, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { useAnalysis } from '@/hooks/use-analyses';
import { formatRelativeTime } from '@/lib/utils';
import { AnalysisOverview } from './_components/analysis-overview';
import { SkillGapsSection } from './_components/skill-gaps-section';
import { AtsSuggestionsSection } from './_components/ats-suggestions-section';

export default function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: analysis, isLoading } = useAnalysis(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-48 shimmer rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 shimmer rounded-2xl" />
          <div className="h-64 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="glass-card flex flex-col items-center py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
        <h2 className="font-semibold">Analysis not found</h2>
        <Link href="/dashboard/analyses" className="mt-4 btn-secondary py-2 px-4 text-sm">Go Back</Link>
      </div>
    );
  }

  const isProcessing = analysis.status === 'PROCESSING' || analysis.status === 'PENDING';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/analyses" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">
            {analysis.job?.title} @ {analysis.job?.company}
          </h1>
          <p className="text-sm text-muted-foreground">
            {analysis.resume?.originalName} • {formatRelativeTime(analysis.createdAt)}
          </p>
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="relative mb-6">
            <div className="h-16 w-16 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-brand-400" />
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
        <div className="glass-card flex flex-col items-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
          <h2 className="font-semibold">Analysis Failed</h2>
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
            <Link href="/dashboard/recommendations" className="glass-card-hover flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-400">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold">View Recommendations</div>
                <div className="text-sm text-muted-foreground">
                  {analysis.aiRecommendations?.length || 0} personalized suggestions
                </div>
              </div>
              <ArrowLeft className="ml-auto h-4 w-4 rotate-180 text-muted-foreground" />
            </Link>

            <Link href="/dashboard/roadmaps" className="glass-card-hover flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-400">
                <Map className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-semibold">Career Roadmap</div>
                <div className="text-sm text-muted-foreground">Your week-by-week plan</div>
              </div>
              <ArrowLeft className="ml-auto h-4 w-4 rotate-180 text-muted-foreground" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
