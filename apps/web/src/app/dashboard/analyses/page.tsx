'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, BarChart3, Loader2, CheckCircle, AlertCircle,
  Clock, ChevronRight, X, FileText, Briefcase
} from 'lucide-react';
import { useAnalyses, useCreateAnalysis } from '@/hooks/use-analyses';
import { useResumes } from '@/hooks/use-resumes';
import { useJobs } from '@/hooks/use-jobs';
import { formatRelativeTime, getScoreColor, cn } from '@/lib/utils';
import Link from 'next/link';
import { createPortal } from 'react-dom';

function NewAnalysisModal({ onClose }: { onClose: () => void }) {
  const { data: resumes } = useResumes();
  const { data: jobs } = useJobs();
  const { mutate: createAnalysis, isPending } = useCreateAnalysis();
  const [resumeId, setResumeId] = useState('');
  const [jobId, setJobId] = useState('');

  const analyzedResumes = resumes?.filter((r) => r.status === 'ANALYZED') || [];

  const handleSubmit = () => {
    if (resumeId && jobId) {
      createAnalysis({ resumeId, jobId }, { onSuccess: () => onClose() });
    }
  };

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
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="modal-card max-w-md p-6"
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">New Analysis</h2>
            <p className="text-sm text-muted-foreground mt-0.5">AI will compare your resume to the job</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Select Resume</label>
            {analyzedResumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No analyzed resumes yet.</p>
                <Link href="/dashboard/resumes" className="text-sm text-brand-400">Upload one →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {analyzedResumes.map((resume) => (
                  <button
                    key={resume.id}
                    onClick={() => setResumeId(resume.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      resumeId === resume.id
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-border hover:border-brand-500/30 hover:bg-foreground/5',
                    )}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{resume.originalName}</div>
                      <div className="text-xs text-muted-foreground">ATS readiness: {Math.round(resume.atsScore || 0)}%</div>
                    </div>
                    {resumeId === resume.id && <CheckCircle className="ml-auto h-4 w-4 text-brand-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Select Job</label>
            {!jobs?.length ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No jobs added yet.</p>
                <Link href="/dashboard/jobs" className="text-sm text-brand-400">Add one →</Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setJobId(job.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      jobId === job.id
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-border hover:border-brand-500/30 hover:bg-foreground/5',
                    )}
                  >
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{job.title}</div>
                      <div className="text-xs text-muted-foreground">{job.company}</div>
                    </div>
                    {jobId === job.id && <CheckCircle className="ml-auto h-4 w-4 text-brand-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-3">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!resumeId || !jobId || isPending}
            className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : 'Start Analysis'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AnalysesPage() {
  const { data: analyses, isLoading } = useAnalyses();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'COMPLETED' | 'FAILED'>('COMPLETED');

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusIcon = (status: string) => {
    if (status === 'COMPLETED') return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    if (status === 'PROCESSING' || status === 'PENDING') return <Loader2 className="h-4 w-4 animate-spin text-brand-400" />;
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  };

  const filteredAnalyses = analyses?.filter((analysis) => {
    if (activeTab === 'COMPLETED') return analysis.status !== 'FAILED';
    if (activeTab === 'FAILED') return analysis.status === 'FAILED';
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="glass-card relative flex flex-col justify-between gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative min-w-0">
          <span className="eyebrow"><BarChart3 className="h-3 w-3" /> Analyses</span>
          <p className="mt-2 text-sm text-muted-foreground">Compare your resumes against job descriptions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary relative w-full shrink-0 px-5 py-2.5 text-sm sm:w-auto">
          <Plus className="h-4 w-4 shrink-0" /> New Analysis
        </button>
      </div>

      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
        {(['COMPLETED', 'FAILED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative min-h-[40px] rounded-xl px-5 text-sm font-medium transition-colors',
              activeTab === tab ? 'text-white' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {activeTab === tab && (
              <motion.span
                layoutId="analyses-tab"
                transition={{ duration: 0.2 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/60 to-violet-500/40 shadow-glow"
              />
            )}
            <span className="relative">{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 shimmer rounded-2xl" />
          ))}
        </div>
      ) : filteredAnalyses.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredAnalyses.map((analysis, i) => {
            const done = analysis.status === 'COMPLETED';
            const score = Math.max(0, Math.min(100, Math.round(analysis.matchScore || 0)));
            const r = 22;
            const c = 2 * Math.PI * r;
            return (
              <Link key={analysis.id} href={`/dashboard/analyses/view?id=${analysis.id}`} className="block min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
                  className="glass-card-hover group flex min-w-0 items-center gap-4 overflow-hidden p-4"
                >
                  {/* Score ring */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                    {done ? (
                      <>
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 52 52">
                          <defs>
                            <linearGradient id={`al-${analysis.id}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#a78bfa" />
                              <stop offset="100%" stopColor="#f472b6" />
                            </linearGradient>
                          </defs>
                          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                          <motion.circle
                            cx="26" cy="26" r={r} fill="none"
                            stroke={`url(#al-${analysis.id})`}
                            strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={c}
                            initial={{ strokeDashoffset: c }}
                            animate={{ strokeDashoffset: c - (score / 100) * c }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                          />
                        </svg>
                        <span className={cn('relative font-display text-sm font-bold', getScoreColor(analysis.matchScore))}>
                          {score}
                        </span>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                        {analysis.status === 'PROCESSING' || analysis.status === 'PENDING' ?
                          <Loader2 className="h-5 w-5 animate-spin text-brand-400" /> :
                          <AlertCircle className="h-5 w-5 text-red-400" />}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display font-semibold">
                        {analysis.job?.title} @ {analysis.job?.company}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{analysis.resume?.originalName}</span>
                      <span className="shrink-0">•</span>
                      <span className="shrink-0">{formatRelativeTime(analysis.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        analysis.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                        analysis.status === 'PROCESSING' ? 'bg-brand-500/15 text-brand-300' :
                        analysis.status === 'PENDING' ? 'bg-white/5 text-muted-foreground' :
                        'bg-red-500/10 text-red-400',
                      )}>
                        {analysis.status}
                      </span>
                      {done && (
                        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          ATS {Math.round(analysis.atsScore)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </motion.div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
            <BarChart3 className="h-8 w-8 text-brand-300" />
          </div>
          <p className="font-display font-semibold">No {activeTab.toLowerCase()} analyses found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {`You don't have any ${activeTab.toLowerCase()} analyses right now.`}
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-6 py-2.5 px-6 text-sm">
            <Plus className="h-4 w-4" /> Start Analysis
          </button>
        </div>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {showModal && <NewAnalysisModal onClose={() => setShowModal(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
