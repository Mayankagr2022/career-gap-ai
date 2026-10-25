import { motion } from 'framer-motion';
import { FileText, Eye, Trash2, CheckCircle, AlertCircle, Clock, Loader2, Brain } from 'lucide-react';
import { formatBytes, formatRelativeTime, cn } from '@/lib/utils';

export function ResumeStatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Pending', icon: Clock, color: 'bg-muted text-muted-foreground' },
    PROCESSING: { label: 'Analyzing...', icon: Loader2, color: 'bg-brand-500/10 text-brand-400', spin: true },
    ANALYZED: { label: 'Ready', icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-400' },
    FAILED: { label: 'Failed', icon: AlertCircle, color: 'bg-red-500/10 text-red-400' },
  }[status] || { label: status, icon: Clock, color: 'bg-muted text-muted-foreground' };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', config.color)}>
      <config.icon className={cn('h-3 w-3', (config as any).spin && 'animate-spin')} />
      {config.label}
    </span>
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
      <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
        <Brain className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="font-semibold">No resumes yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Upload your first resume to get started</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 font-semibold text-muted-foreground">Your Resumes</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
        {resumes.map((resume) => (
          <motion.div
            key={resume.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-hover p-5 min-w-0 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
                <FileText className="h-5 w-5 text-brand-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{resume.originalName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatBytes(resume.fileSize)} • {formatRelativeTime(resume.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <ResumeStatusBadge status={resume.status} />
              {resume.atsScore !== null && resume.atsScore !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ATS: <span className="font-medium text-foreground">{Math.round(resume.atsScore)}%</span>
                </span>
              )}
            </div>

            {resume.status === 'FAILED' && resume.errorMessage && (
              <p className="mt-3 break-words rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {resume.errorMessage}
              </p>
            )}

            {/* Skills preview */}
            {resume.parsedData?.skills && (
              <div className="mt-3 flex flex-wrap gap-1">
                {resume.parsedData.skills.slice(0, 4).map((skill: string) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
                {resume.parsedData.skills.length > 4 && (
                  <span className="skill-tag">+{resume.parsedData.skills.length - 4}</span>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
              <button
                onClick={() => onView(resume)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button
                onClick={() => onDelete(resume.id)}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
