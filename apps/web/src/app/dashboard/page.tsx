'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

import { StatCards } from './_components/stat-cards';
import { QuickActions } from './_components/quick-actions';

// Lazy loaded components for below the fold or complex rendering
const LatestAnalysis = dynamic(() => import('./_components/latest-analysis').then(m => m.LatestAnalysis), {
  loading: () => <div className="glass-card p-6 lg:col-span-2 h-[200px] shimmer rounded-2xl" />
});
const RecentAnalyses = dynamic(() => import('./_components/recent-analyses').then(m => m.RecentAnalyses), {
  loading: () => <div className="glass-card p-6 h-[250px] shimmer rounded-2xl" />
});
const TrendingSkills = dynamic(() => import('./_components/trending-skills').then(m => m.TrendingSkills), {
  loading: () => <div className="glass-card p-6 h-[250px] shimmer rounded-2xl" />
});

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: resumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get<any[]>('/resumes'),
  });

  const processingResumes = resumes?.filter((r) => r.status === 'PROCESSING' || r.status === 'PENDING') || [];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="font-display text-3xl font-bold">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="gradient-text">{user?.name.split(' ')[0]}</span> 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Here's your career progress overview</p>
      </div>

      {/* Processing indicator */}
      {processingResumes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 p-4"
        >
          <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
          <p className="text-sm text-brand-300">
            AI is analyzing {processingResumes.length} resume{processingResumes.length > 1 ? 's' : ''}...
            This may take a moment.
          </p>
        </motion.div>
      )}

      {/* Stats grid */}
      <StatCards />

      {/* Latest Analysis & Quick Start */}
      <div className="grid gap-6 lg:grid-cols-3">
        <LatestAnalysis />
        <QuickActions />
      </div>

      {/* Recent analyses + Trending skills */}
      <div className="grid gap-6 lg:grid-cols-2 w-full min-w-0">
        <RecentAnalyses />
        <TrendingSkills />
      </div>
    </div>
  );
}
