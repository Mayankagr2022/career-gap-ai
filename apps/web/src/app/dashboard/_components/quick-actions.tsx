'use client';

import Link from 'next/link';
import { FileText, Briefcase, BarChart3, ArrowRight } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">Quick Actions</h2>
      <div className="space-y-2">
        {[
          { href: '/dashboard/resumes', icon: FileText, label: 'Upload Resume', desc: 'Add or update your resume' },
          { href: '/dashboard/jobs', icon: Briefcase, label: 'Add Job', desc: 'Paste a job description' },
          { href: '/dashboard/analyses', icon: BarChart3, label: 'New Analysis', desc: 'Compare resume to job' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-foreground/5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <action.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.desc}</div>
            </div>
            <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
