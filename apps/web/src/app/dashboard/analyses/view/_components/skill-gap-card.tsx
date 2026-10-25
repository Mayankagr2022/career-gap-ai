import { cn } from '@/lib/utils';
import { Target, Code2, BookOpen, Zap, Award } from 'lucide-react';

export function SkillGapCard({ gap }: { gap: any }) {
  const importanceColor = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
    IMPORTANT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    NICE_TO_HAVE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }[gap.importance as string] || 'text-muted-foreground bg-muted border-border';

  const categoryIcon = {
    TECHNICAL: Code2,
    SOFT: Target,
    DOMAIN: BookOpen,
    TOOL: Zap,
    CERTIFICATION: Award,
  }[gap.category as string] || Target;

  const Icon = categoryIcon;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-foreground/[0.02] transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{gap.skill}</span>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', importanceColor)}>
            {gap.importance.replace('_', ' ')}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500/40"
              style={{ width: `${(gap.currentLevel / 10) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {gap.currentLevel}/10 → {gap.requiredLevel}/10
          </span>
        </div>
      </div>
    </div>
  );
}
