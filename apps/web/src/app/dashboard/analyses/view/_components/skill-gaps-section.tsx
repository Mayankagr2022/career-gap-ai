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
        className="flex w-full items-center justify-between p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
            <Target className="h-4.5 w-4.5 text-red-400" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Skill Gaps</div>
            <div className="text-xs text-muted-foreground">{analysis.skillGaps.length} gaps identified</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-6 pb-6">
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {analysis.skillGaps.map((gap: any, i: number) => (
              <SkillGapCard key={i} gap={gap} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
