import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
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
        className="modal-card max-w-2xl max-h-[80vh] overflow-y-auto p-6"
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{resume.originalName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && !detail ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        ) : full.parsedData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-3">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="mt-1 font-medium">{full.parsedData.name}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-xs text-muted-foreground">Experience</div>
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
                <div className="space-y-2">
                  {full.parsedData.experience.slice(0, 3).map((exp: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{exp.title}</div>
                        <div className="text-xs text-muted-foreground">{exp.startDate} — {exp.endDate || 'Present'}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{exp.company}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            {full.status === 'PROCESSING' ? 'AI is still analyzing this resume...' : 'No parsed data available'}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
