import { motion } from 'framer-motion';
import { FileText, Eye, Trash2, CheckCircle, AlertCircle, Clock, Loader2, Brain } from 'lucide-react';
import { formatBytes, formatRelativeTime, cn } from '@/lib/utils';

export function ResumeStatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Pending', icon: Clock, color: 'border-white/10 bg-white/[0.05] text-muted-foreground' },
    PROCESSING: { label: 'Analyzing...', icon: Loader2, color: 'border-brand-400/30 bg-brand-500/10 text-brand-300', spin: true },
    ANALYZED: { label: 'Ready', icon: CheckCircle, color: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
    FAILED: { label: 'Failed', icon: AlertCircle, color: 'border-red-400/30 bg-red-500/10 text-red-300' },
  }[status] || { label: status, icon: Clock, color: 'border-white/10 bg-white/[0.05] text-muted-foreground' };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', config.color)}>
      <config.icon className={cn('h-3 w-3', (config as any).spin && 'animate-spin')} />
      {config.label}
    </span>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const stroke = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#fb7185';
  return (
    <div
      className="relative h-14 w-14 shrink-0"
      title="Format and completeness of the resume. Each analysis also scores ATS against its job."
    >
      <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 4px ${stroke})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold">{Math.round(pct)}</span>
        <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-muted-foreground">ATS</span>
      </div>
    </div>
  );
}

export function ResumeList({
  resumes,
  onView,
  onDelete,
}: {
  resumes: any[];
  onView: (resume: any) => void;
  onDelete: (id: string) => void;
}) {
  if (!resumes || resumes.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-brand-500/10">
          <Brain className="h-8 w-8 text-brand-300" />
        </div>
        <p className="font-display text-lg font-semibold">No resumes yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Upload your first resume to get started</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold">Your Resumes</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-muted-foreground">
          {resumes.length}
        </span>
      </div>
      <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resumes.map((resume, i) => (
          <motion.div
            key={resume.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05, ease: 'easeOut' }}
            className="glass-card-hover group flex min-w-0 flex-col overflow-hidden p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-violet-500/20 ring-1 ring-white/10">
                <FileText className="h-6 w-6 text-brand-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{resume.originalName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatBytes(resume.fileSize)} • {formatRelativeTime(resume.createdAt)}
                </p>
                <div className="mt-2">
                  <ResumeStatusBadge status={resume.status} />
                </div>
              </div>
              {resume.atsScore !== null && resume.atsScore !== undefined && (
                <ScoreRing value={resume.atsScore} />
              )}
            </div>

            {resume.status === 'FAILED' && resume.errorMessage && (
              <p className="mt-3 break-words rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {resume.errorMessage}
              </p>
            )}

            {resume.skills?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {resume.skills.map((skill: string) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
                {resume.skillCount > resume.skills.length && (
                  <span className="skill-tag">+{resume.skillCount - resume.skills.length}</span>
                )}
              </div>
            )}

            <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-3 [margin-top:1rem]">
              <button
                onClick={() => onView(resume)}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button
                onClick={() => onDelete(resume.id)}
                className="ml-auto flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
