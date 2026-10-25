import { getScoreColor, getScoreLabel, cn } from '@/lib/utils';

export function ScoreRing({ score, label, size = 'lg' }: { score: number; label: string; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-32 w-32' : 'h-20 w-20';
  const textSize = size === 'lg' ? 'text-3xl' : 'text-xl';
  const circumference = 2 * Math.PI * (size === 'lg' ? 52 : 32);
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative flex items-center justify-center', sizeClass)}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(220, 20%, 15%)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="relative text-center">
          <div className={cn('font-display font-bold', textSize, getScoreColor(score))}>
            {Math.round(score)}
          </div>
          <div className="text-[10px] text-muted-foreground">/ 100</div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold">{label}</div>
        <div className={cn('text-xs', getScoreColor(score))}>{getScoreLabel(score)}</div>
      </div>
    </div>
  );
}
