'use client';

import { useState } from 'react';
import { Zap, ChevronUp, ChevronDown, AlertTriangle, Lightbulb } from 'lucide-react';
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
        className="flex min-h-[64px] w-full items-center justify-between gap-3 p-5 sm:p-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20">
            <Zap className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0 text-left">
            <div className="font-display font-semibold">ATS Optimization Tips</div>
            <div className="text-xs text-muted-foreground">{analysis.atsSuggestions.length} suggestions</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.atsSuggestions.map((suggestion: any, i: number) => (
              <div
                key={i}
                className={cn(
                  'relative min-w-0 overflow-hidden rounded-2xl border p-4 pl-5',
                  suggestion.severity === 'HIGH' ? 'border-rose-500/25 bg-rose-500/[0.06]' :
                  suggestion.severity === 'MEDIUM' ? 'border-amber-500/25 bg-amber-500/[0.06]' :
                  'border-white/10 bg-white/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 w-1',
                    suggestion.severity === 'HIGH' ? 'bg-rose-400' :
                    suggestion.severity === 'MEDIUM' ? 'bg-amber-400' : 'bg-white/20',
                  )}
                />
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    suggestion.severity === 'HIGH' ? 'text-rose-400' :
                    suggestion.severity === 'MEDIUM' ? 'text-amber-400' : 'text-muted-foreground',
                  )} />
                  <div className="min-w-0">
                    <div className="break-words text-sm font-medium">{suggestion.message}</div>
                    <div className="mt-1.5 flex gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
                      <span className="min-w-0 break-words">{suggestion.suggestion}</span>
                    </div>
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
