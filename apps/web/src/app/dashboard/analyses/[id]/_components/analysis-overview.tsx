import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ScoreRing } from './score-ring';

export function AnalysisOverview({ analysis }: { analysis: any }) {
  return (
    <div className="glass-card p-6">
      <h2 className="mb-6 font-display text-lg font-semibold">Analysis Overview</h2>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-around">
        <ScoreRing score={analysis.matchScore} label="Match Score" />
        <ScoreRing score={analysis.atsScore} label="ATS Score" />

        <div className="flex-1 space-y-3 max-w-sm">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" /> Strengths
            </div>
            <ul className="space-y-1">
              {(analysis.strengths || []).slice(0, 3).map((s: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground">• {s}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Gaps
            </div>
            <ul className="space-y-1">
              {(analysis.weaknesses || []).slice(0, 3).map((w: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground">• {w}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {analysis.rawAnalysis?.executiveSummary && (
        <div className="mt-6 rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <p className="text-sm leading-relaxed text-foreground/80">
              {analysis.rawAnalysis.executiveSummary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
