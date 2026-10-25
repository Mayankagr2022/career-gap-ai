'use client';

import { useState } from 'react';
import { Target, ChevronUp, ChevronDown } from 'lucide-react';
import { SkillGapCard } from './skill-gap-card';

export function SkillGapsSection({ analysis }: { analysis: any }) {
  const [expanded, setExpanded] = useState(true);

  if (!analysis.skillGaps || analysis.skillGaps.length === 0) {
    return null;
  }

  return (
    <div className="glass-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-[64px] w-full items-center justify-between gap-3 p-5 sm:p-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/30 to-violet-500/20">
            <Target className="h-5 w-5 text-rose-300" />
          </div>
          <div className="min-w-0 text-left">
            <div className="font-display font-semibold">Skill Gaps</div>
            <div className="text-xs text-muted-foreground">{analysis.skillGaps.length} gaps identified</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.skillGaps.map((gap: any, i: number) => (
              <SkillGapCard key={i} gap={gap} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
