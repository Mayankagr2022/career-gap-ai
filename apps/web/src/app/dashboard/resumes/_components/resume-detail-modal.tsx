import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export function ResumeDetailModal({
  resume,
  onClose,
}: {
  resume: any;
  onClose: () => void;
}) {
  if (!resume) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{resume.originalName}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {resume.parsedData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-3">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="mt-1 font-medium">{resume.parsedData.name}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-xs text-muted-foreground">Experience</div>
                <div className="mt-1 font-medium">{resume.parsedData.totalYearsExperience}y • {resume.parsedData.seniorityLevel}</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Skills ({resume.parsedData.skills?.length || 0})</h3>
              <div className="flex flex-wrap gap-1.5">
                {resume.parsedData.skills?.map((skill: string) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>

            {resume.parsedData.experience?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Experience</h3>
                <div className="space-y-2">
                  {resume.parsedData.experience.slice(0, 3).map((exp: any, i: number) => (
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
            {resume.status === 'PROCESSING' ? 'AI is still analyzing this resume...' : 'No parsed data available'}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
