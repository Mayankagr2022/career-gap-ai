'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useResumes } from '@/hooks/use-resumes';

import { StatCards } from './_components/stat-cards';
import { QuickActions } from './_components/quick-actions';

// Lazy loaded components for below the fold or complex rendering
const LatestAnalysis = dynamic(() => import('./_components/latest-analysis').then(m => m.LatestAnalysis), {
  loading: () => <div className="glass-card p-6 lg:col-span-2 h-[260px] shimmer rounded-2xl" />
});
const RecentAnalyses = dynamic(() => import('./_components/recent-analyses').then(m => m.RecentAnalyses), {
  loading: () => <div className="glass-card p-6 h-[250px] shimmer rounded-2xl" />
});
const TrendingSkills = dynamic(() => import('./_components/trending-skills').then(m => m.TrendingSkills), {
  loading: () => <div className="glass-card p-6 h-[250px] shimmer rounded-2xl" />
});

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: resumes } = useResumes();

  const processingResumes = resumes?.filter((r) => r.status === 'PROCESSING' || r.status === 'PENDING') || [];
  const hour = new Date().getHours();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Compact greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-2"
      >
        <span className="eyebrow w-fit">
          <Sparkles className="h-3 w-3" /> Your overview
        </span>
        <p className="font-display text-xl font-semibold sm:text-2xl">
          Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="gradient-text">{user?.name.split(' ')[0]}</span>
          <span className="text-muted-foreground"> — here's your career progress.</span>
        </p>
      </motion.div>

      {/* Processing indicator */}
      {processingResumes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-brand-400/25 bg-brand-500/10 p-4"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-300" />
          <p className="text-sm text-brand-200">
            AI is analyzing {processingResumes.length} resume{processingResumes.length > 1 ? 's' : ''}...
            This may take a moment.
          </p>
        </motion.div>
      )}

      {/* Bento: hero score card + quick actions */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <LatestAnalysis />
        <QuickActions />
      </div>

      {/* Stat tiles */}
      <StatCards />

      {/* Recent analyses + Trending skills */}
      <div className="grid w-full min-w-0 gap-4 sm:gap-5 lg:grid-cols-2">
        <RecentAnalyses />
        <TrendingSkills />
      </div>
    </div>
  );
}
