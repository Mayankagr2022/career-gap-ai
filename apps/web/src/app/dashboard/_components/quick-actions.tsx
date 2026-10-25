'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Briefcase, BarChart3, ArrowRight } from 'lucide-react';

const ACTIONS = [
  { href: '/dashboard/resumes', icon: FileText, label: 'Upload Resume', desc: 'Add or update your resume', gradient: 'from-brand-500 to-cyan-400' },
  { href: '/dashboard/jobs', icon: Briefcase, label: 'Add Job', desc: 'Paste a job description', gradient: 'from-violet-500 to-brand-500' },
  { href: '/dashboard/analyses', icon: BarChart3, label: 'New Analysis', desc: 'Compare resume to job', gradient: 'from-pink-500 to-amber-400' },
];

export function QuickActions() {
  return (
    <div className="grid min-w-0 gap-3 min-[900px]:grid-cols-3 lg:grid-cols-1">
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.href}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 + i * 0.07 }}
          className="min-w-0"
        >
          <Link
            href={action.href}
            className="glass-card-hover group flex min-h-[72px] items-center gap-4 p-4"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${action.gradient}`}>
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-semibold">{action.label}</div>
              <div className="truncate text-xs text-muted-foreground">{action.desc}</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
