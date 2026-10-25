'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Briefcase, BarChart3, Lightbulb, ArrowUpRight } from 'lucide-react';
import { useUserStats } from '@/hooks/use-user-stats';
import { CountUp } from '../analyses/view/_components/score-ring';

// Purely decorative wave, one per tile.
const WAVES = [
  'M0 26 C12 24 18 10 30 14 S48 28 60 18 S80 4 100 8',
  'M0 20 C14 28 22 8 36 12 S58 26 70 14 S88 10 100 4',
  'M0 28 C10 20 24 22 34 16 S54 6 66 14 S86 20 100 6',
  'M0 24 C16 26 20 14 34 18 S56 8 68 12 S90 22 100 10',
];

function StatCard({
  icon: Icon, label, value, href, gradient, glow, stroke, index,
}: {
  icon: any; label: string; value: number;
  href: string; gradient: string; glow: string; stroke: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 * index }}
      className="min-w-0"
    >
      <Link href={href} className="glass-card-hover group relative block overflow-hidden p-4 sm:p-5">
        <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-40 ${glow}`} />
        <div className="relative flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ${gradient}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        <div className="relative mt-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <CountUp value={value} className="font-display text-3xl font-bold tabular-nums sm:text-4xl" />
            <div className="mt-0.5 truncate text-sm text-muted-foreground">{label}</div>
          </div>
          <svg viewBox="0 0 100 32" className="h-8 w-16 shrink-0 sm:w-20" fill="none" aria-hidden>
            <path d={WAVES[index % WAVES.length]} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

export function StatCards() {
  const { data: stats, isLoading: statsLoading } = useUserStats();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {statsLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[128px] shimmer rounded-2xl" />
        ))
      ) : (
        <>
          <StatCard
            index={0}
            icon={FileText}
            label="Resumes"
            value={stats?.resumeCount ?? 0}
            href="/dashboard/resumes"
            gradient="from-brand-500 to-cyan-400"
            glow="bg-cyan-400"
            stroke="#22d3ee"
          />
          <StatCard
            index={1}
            icon={Briefcase}
            label="Jobs Added"
            value={stats?.jobCount ?? 0}
            href="/dashboard/jobs"
            gradient="from-violet-500 to-brand-500"
            glow="bg-violet-500"
            stroke="#f472b6"
          />
          <StatCard
            index={2}
            icon={BarChart3}
            label="Analyses"
            value={stats?.analysisCount ?? 0}
            href="/dashboard/analyses"
            gradient="from-emerald-500 to-cyan-400"
            glow="bg-emerald-400"
            stroke="#34d399"
          />
          <StatCard
            index={3}
            icon={Lightbulb}
            label="Recommendations"
            value={stats?.recommendationCount ?? 0}
            href="/dashboard/recommendations"
            gradient="from-amber-500 to-pink-500"
            glow="bg-amber-400"
            stroke="#fbbf24"
          />
        </>
      )}
    </div>
  );
}
