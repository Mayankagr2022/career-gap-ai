import { motion } from 'framer-motion';
import { Loader2, X, FileText } from 'lucide-react';
import { useResume } from '@/hooks/use-resumes';

export function ResumeDetailModal({
  resume,
  onClose,
}: {
  resume: any;
  onClose: () => void;
}) {
  // The list row has no parsed data; load the full resume once the modal opens
  const { data: detail, isLoading } = useResume(resume?.id ?? '');
  if (!resume) return null;
  const full = detail ?? resume;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="modal-card max-h-[85dvh] max-w-2xl overflow-y-auto p-5 sm:p-6"
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/30 to-violet-500/20 ring-1 ring-white/10">
            <FileText className="h-5 w-5 text-brand-200" />
          </div>
          <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold sm:text-xl">{resume.originalName}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && !detail ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        ) : full.parsedData ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Name</div>
                <div className="mt-1 break-words font-medium">{full.parsedData.name}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Experience</div>
                <div className="mt-1 font-medium">{full.parsedData.totalYearsExperience}y • {full.parsedData.seniorityLevel}</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Skills ({full.parsedData.skills?.length || 0})</h3>
              <div className="flex flex-wrap gap-1.5">
                {full.parsedData.skills?.map((skill: string) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>

            {full.parsedData.experience?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Experience</h3>
                <div className="space-y-2 border-l border-brand-400/30 pl-4">
                  {full.parsedData.experience.slice(0, 3).map((exp: any, i: number) => (
                    <div key={i} className="relative rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <span className="absolute -left-[1.4rem] top-4 h-2.5 w-2.5 rounded-full bg-brand-400 shadow-glow" />
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0 break-words text-sm font-medium">{exp.title}</div>
                        <div className="text-xs text-muted-foreground">{exp.startDate} — {exp.endDate || 'Present'}</div>
                      </div>
                      <div className="mt-0.5 break-words text-xs text-muted-foreground">{exp.company}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {full.status === 'PROCESSING' ? 'AI is still analyzing this resume...' : 'No parsed data available'}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
