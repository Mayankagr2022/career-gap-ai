'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Briefcase, Trash2, MapPin, Building, Calendar,
  ChevronRight, Loader2, X, Globe, DollarSign, FileText
} from 'lucide-react';
import { useJobs, useCreateJob, useDeleteJob } from '@/hooks/use-jobs';
import { formatRelativeTime, cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { JobFileUpload } from './_components/job-file-upload';

function AddJobModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const { mutate: createJob, isPending } = useCreateJob();
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: { title: '', company: '', description: '', location: '', remote: false },
  });

  const onSubmit = (data: any) => {
    createJob(data, { onSuccess: onClose });
  };

  const descLength = watch('description', '').length;

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
        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Add Job Description</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">AI will parse requirements automatically</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm font-medium">
          {([['paste', 'Paste text'], ['upload', 'Upload file']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-lg py-2 transition-colors',
                tab === key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <JobFileUpload onCancel={onClose} onDone={onClose} />
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Job Title *</label>
              <input
                {...register('title', { required: 'Required' })}
                className="input-field"
                placeholder="Senior Software Engineer"
              />
              {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message as string}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Company *</label>
              <input
                {...register('company', { required: 'Required' })}
                className="input-field"
                placeholder="Google"
              />
              {errors.company && <p className="mt-1 text-xs text-red-400">{errors.company.message as string}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Location</label>
              <input
                {...register('location')}
                className="input-field"
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  {...register('remote')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-brand-500"
                />
                <span className="text-sm">Remote position</span>
              </label>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">Job Description *</label>
              <span className={cn('text-xs', descLength >= 100 ? 'text-emerald-400' : 'text-muted-foreground')}>
                {descLength} chars {descLength < 100 && `(min 100)`}
              </span>
            </div>
            <textarea
              {...register('description', { required: 'Required', minLength: { value: 100, message: 'Min 100 characters' } })}
              rows={10}
              className="input-field resize-none"
              placeholder="Paste the complete job description here. Our AI will extract skills, requirements, keywords, and more..."
            />
            {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description.message as string}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1 py-3">
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> AI Parsing...</>
              ) : (
                <>Add Job</>
              )}
            </button>
          </div>
        </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const { mutate: deleteJob } = useDeleteJob();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Job Descriptions</h1>
          <p className="mt-1 text-muted-foreground">Add jobs to compare against your resumes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary py-2.5 px-5 text-sm w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 shrink-0" /> Add Job
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 shimmer rounded-2xl" />
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card-hover p-5 min-w-0 overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <Briefcase className="h-5 w-5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{job.title}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building className="h-3 w-3" /> {job.company}
                  </p>
                </div>
              </div>

              {(job.location || job.remote) && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  {job.remote ? (
                    <><Globe className="h-3 w-3" /> Remote</>
                  ) : (
                    <><MapPin className="h-3 w-3" /> {job.location}</>
                  )}
                </div>
              )}

              {job.sourceFilename && (
                <div className="mt-2 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{job.sourceFilename}</span>
                </div>
              )}

              {/* Required skills */}
              {job.requiredSkills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {job.requiredSkills.slice(0, 4).map((skill: string) => (
                    <span key={skill} className="skill-tag">{skill}</span>
                  ))}
                  {job.requiredSkills.length > 4 && (
                    <span className="skill-tag">+{job.requiredSkills.length - 4}</span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  {job._count?.analyses || 0} analyses
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(job.createdAt)}</span>
                <button
                  onClick={() => deleteJob(job.id)}
                  className="ml-auto text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-semibold">No jobs added yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a job description and our AI will extract all requirements
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-6 py-2.5 px-6 text-sm">
            <Plus className="h-4 w-4" /> Add Your First Job
          </button>
        </div>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {showModal && <AddJobModal onClose={() => setShowModal(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
