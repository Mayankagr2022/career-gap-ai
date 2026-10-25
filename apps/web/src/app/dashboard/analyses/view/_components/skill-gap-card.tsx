'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Target, Code2, BookOpen, Zap, Award } from 'lucide-react';

export function SkillGapCard({ gap, index = 0 }: { gap: any; index?: number }) {
  const importanceColor =
    {
      CRITICAL: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
      IMPORTANT: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
      NICE_TO_HAVE: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    }[gap.importance as string] || 'text-muted-foreground bg-white/5 border-white/10';

  const Icon =
    {
      TECHNICAL: Code2,
      SOFT: Target,
      DOMAIN: BookOpen,
      TOOL: Zap,
      CERTIFICATION: Award,
    }[gap.category as string] || Target;

  const current = Math.max(0, Math.min(10, Number(gap.currentLevel) || 0)) * 10;
  const required = Math.max(0, Math.min(10, Number(gap.requiredLevel) || 0)) * 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-brand-400/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/30 to-violet-500/20 text-brand-200">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{gap.skill}</div>
          <span className={cn('mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', importanceColor)}>
            {String(gap.importance || '').replace('_', ' ')}
          </span>
        </div>
        <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{gap.currentLevel}</span>
          <span className="mx-1">→</span>
          <span className="font-semibold text-brand-300">{gap.requiredLevel}</span>
          <span className="text-muted-foreground/60">/10</span>
        </div>
      </div>

      {/* Current level (filled) vs required (marker) */}
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-400/25" style={{ width: `${required}%` }} />
        <motion.div
          className="progress-fill absolute inset-y-0 left-0"
          initial={{ width: 0 }}
          animate={{ width: `${current}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>Current</span>
        <span>Required</span>
      </div>
    </motion.div>
  );
}
