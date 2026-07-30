'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Briefcase, BarChart3, Lightbulb, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

function StatCard({
  icon: Icon, label, value, trend, href, gradient
}: {
  icon: any; label: string; value: string | number;
  trend?: string; href: string; gradient: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        className="glass-card-hover p-5 cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-3">
          <div className="font-display text-3xl font-bold">{value}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
          {trend && <div className="mt-1 text-xs text-emerald-400">{trend}</div>}
        </div>
      </motion.div>
    </Link>
  );
}

export function StatCards() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get<any>('/users/stats'),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 h-[116px] shimmer rounded-2xl" />
        ))
      ) : (
        <>
          <StatCard
            icon={FileText}
            label="Resumes"
            value={stats?.resumeCount ?? 0}
            href="/dashboard/resumes"
            gradient="from-blue-500 to-cyan-400"
          />
          <StatCard
            icon={Briefcase}
            label="Jobs Added"
            value={stats?.jobCount ?? 0}
            href="/dashboard/jobs"
            gradient="from-violet-500 to-purple-400"
          />
          <StatCard
            icon={BarChart3}
            label="Analyses"
            value={stats?.analysisCount ?? 0}
            href="/dashboard/analyses"
            gradient="from-emerald-500 to-green-400"
          />
          <StatCard
            icon={Lightbulb}
            label="Recommendations"
            value={stats?.recommendationCount ?? 0}
            href="/dashboard/recommendations"
            gradient="from-amber-500 to-orange-400"
          />
        </>
      )}
    </div>
  );
}
