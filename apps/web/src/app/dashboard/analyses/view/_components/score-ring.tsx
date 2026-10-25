'use client';

import { useEffect, useId, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { getScoreColor, getScoreLabel, cn } from '@/lib/utils';

/** Number that counts up from 0 to `value` when mounted. */
export function CountUp({ value, duration = 0.9, className }: { value: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, Number(value) || 0, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}

function ringStops(score: number): [string, string] {
  if (score >= 80) return ['#34d399', '#22d3ee'];
  if (score >= 60) return ['#fbbf24', '#fb923c'];
  if (score >= 40) return ['#fb923c', '#f472b6'];
  return ['#f43f5e', '#ec4899'];
}

export function ScoreRing({
  score,
  label,
  size = 'lg',
  showLabel = true,
}: {
  score: number;
  label: string;
  size?: 'sm' | 'lg';
  showLabel?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const sizeClass = size === 'lg' ? 'h-36 w-36 sm:h-40 sm:w-40' : 'h-20 w-20';
  const textSize = size === 'lg' ? 'text-4xl' : 'text-xl';
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, Number(score) || 0));
  const target = circumference - (safe / 100) * circumference;
  const [from, to] = ringStops(safe);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn('relative flex items-center justify-center', sizeClass)}>
        <div
          className="absolute inset-2 rounded-full opacity-40 blur-2xl"
          style={{ background: `radial-gradient(circle, ${from}, transparent 70%)` }}
        />
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={`url(#ring-${uid})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: target }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </svg>
        <div className="relative text-center">
          <CountUp value={safe} className={cn('font-display font-bold', textSize, getScoreColor(score))} />
          <div className="text-[10px] text-muted-foreground">/ 100</div>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <div className="text-sm font-semibold">{label}</div>
          <div className={cn('text-xs', getScoreColor(score))}>{getScoreLabel(score)}</div>
        </div>
      )}
    </div>
  );
}
