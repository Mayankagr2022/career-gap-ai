'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Briefcase, Trash2, MapPin, Loader2, X, Globe, FileText, Sparkles, Layers,
} from 'lucide-react';
import { useJobs, useCreateJob, useDeleteJob } from '@/hooks/use-jobs';
import { formatRelativeTime, cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { JobFileUpload } from './_components/job-file-upload';

const AVATAR_GRADIENTS = [
  'from-brand-500 to-violet-500',
  'from-cyan-400 to-brand-500',
  'from-emerald-400 to-cyan-500',
  'from-amber-400 to-violet-500',
  'from-violet-500 to-brand-600',
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

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
    // Slide-over: full-height panel docked right on md+, near full-screen sheet on phones
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay !items-stretch !justify-end !p-0 sm:!p-3"
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        className="modal-card !rounded-none h-full max-w-xl overflow-y-auto p-5 sm:!rounded-3xl sm:p-6"
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold">Add Job Description</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">AI will parse requirements automatically</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 text-sm font-medium">
          {([['paste', 'Paste text'], ['upload', 'Upload file']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'min-h-[40px] rounded-lg transition-all',
                tab === key
                  ? 'bg-gradient-to-r from-brand-500/60 to-violet-500/50 text-white shadow-glow'
                  : 'text-muted-foreground hover:text-foreground',
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
              <label className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4">
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
            <div className="progress-bar mt-2 h-1">
              <div className="progress-fill" style={{ width: `${Math.min(100, descLength)}%` }} />
            </div>
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
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <span className="eyebrow w-fit"><Layers className="h-3 w-3" /> Target roles</span>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Add jobs to compare against your resumes
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary w-full shrink-0 px-5 py-2.5 text-sm sm:w-auto">
          <Plus className="h-4 w-4 shrink-0" /> Add Job
        </button>
      </div>

      {isLoading ? (
        <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 shimmer rounded-2xl" />
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05, ease: 'easeOut' }}
              className="glass-card-hover flex min-w-0 flex-col overflow-hidden p-5"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-bold text-white shadow-lg',
                    avatarGradient(job.company || job.title || '?'),
                  )}
                >
                  {(job.company || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{job.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{job.company}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {job.remote ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <Globe className="h-3 w-3" /> Remote
                  </span>
                ) : job.location ? (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{job.location}</span>
                  </span>
                ) : null}
                {(job._count?.analyses || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-300">
                    <Sparkles className="h-3 w-3" /> {job._count?.analyses} analyzed
                  </span>
                )}
              </div>

              {job.sourceFilename && (
                <div className="mt-2 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{job.sourceFilename}</span>
                </div>
              )}

              {job.requiredSkills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.requiredSkills.slice(0, 4).map((skill: string) => (
                    <span key={skill} className="skill-tag">{skill}</span>
                  ))}
                  {job.requiredSkills.length > 4 && (
                    <span className="skill-tag">+{job.requiredSkills.length - 4}</span>
                  )}
                </div>
              )}

              <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-3 [margin-top:1rem]">
                <span className="text-xs text-muted-foreground">
                  {job._count?.analyses || 0} analyses
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="truncate text-xs text-muted-foreground">{formatRelativeTime(job.createdAt)}</span>
                <button
                  onClick={() => deleteJob(job.id)}
                  aria-label="Delete job"
                  className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-brand-500/10">
            <Briefcase className="h-8 w-8 text-brand-300" />
          </div>
          <p className="font-display text-lg font-semibold">No jobs added yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Paste a job description and our AI will extract all requirements
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-6 px-6 py-2.5 text-sm">
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
