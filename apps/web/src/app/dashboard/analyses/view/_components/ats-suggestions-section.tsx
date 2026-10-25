import { useState } from 'react';
import { Zap, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AtsSuggestionsSection({ analysis }: { analysis: any }) {
  const [expanded, setExpanded] = useState(true);

  if (!analysis.atsSuggestions || analysis.atsSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="glass-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <Zap className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div className="text-left">
            <div className="font-semibold">ATS Optimization Tips</div>
            <div className="text-xs text-muted-foreground">{analysis.atsSuggestions.length} suggestions</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-6 pb-6">
          <div className="mt-4 space-y-3">
            {analysis.atsSuggestions.map((suggestion: any, i: number) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl border p-4',
                  suggestion.severity === 'HIGH' ? 'border-red-500/20 bg-red-500/5' :
                  suggestion.severity === 'MEDIUM' ? 'border-amber-500/20 bg-amber-500/5' :
                  'border-border bg-muted/30',
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn(
                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                    suggestion.severity === 'HIGH' ? 'text-red-400' :
                    suggestion.severity === 'MEDIUM' ? 'text-amber-400' : 'text-muted-foreground',
                  )} />
                  <div>
                    <div className="text-sm font-medium">{suggestion.message}</div>
                    <div className="mt-1 text-xs text-muted-foreground">💡 {suggestion.suggestion}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
