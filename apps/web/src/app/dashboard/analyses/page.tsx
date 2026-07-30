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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="glass-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">New Analysis</h2>
            <p className="text-sm text-muted-foreground mt-0.5">AI will compare your resume to the job</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
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
                      <div className="text-xs text-muted-foreground">ATS: {Math.round(resume.atsScore || 0)}%</div>
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Analyses</h1>
          <p className="mt-1 text-muted-foreground">Compare your resumes against job descriptions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary py-2.5 px-5 text-sm w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 shrink-0" /> New Analysis
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-px">
        {(['COMPLETED', 'FAILED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px',
              activeTab === tab 
                ? 'text-foreground border-b-2 border-brand-500' 
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
            )}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-2xl" />
          ))}
        </div>
      ) : filteredAnalyses.length > 0 ? (
        <div className="space-y-3">
          {filteredAnalyses.map((analysis) => (
            <Link key={analysis.id} href={`/dashboard/analyses/${analysis.id}`} className="block">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card-hover flex items-center gap-4 p-4 min-w-0 overflow-hidden"
              >
                {/* Score */}
                <div className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold font-display',
                  analysis.status === 'COMPLETED' ? getScoreColor(analysis.matchScore) : 'text-muted-foreground',
                  'bg-background shadow-sm border border-border/50',
                )}>
                  {analysis.status === 'COMPLETED' ? `${Math.round(analysis.matchScore)}` :
                   analysis.status === 'PROCESSING' || analysis.status === 'PENDING' ?
                   <Loader2 className="h-6 w-6 animate-spin text-brand-400" /> :
                   <AlertCircle className="h-6 w-6 text-red-400" />}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {analysis.job?.title} @ {analysis.job?.company}
                    </span>
                    <span className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      analysis.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                      analysis.status === 'PROCESSING' ? 'bg-brand-500/10 text-brand-400' :
                      analysis.status === 'PENDING' ? 'bg-muted text-muted-foreground' :
                      'bg-red-500/10 text-red-400',
                    )}>
                      {analysis.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <span className="truncate">{analysis.resume?.originalName}</span>
                    <span className="shrink-0">•</span>
                    <span className="shrink-0">{formatRelativeTime(analysis.createdAt)}</span>
                    {analysis.status === 'COMPLETED' && (
                      <>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0">ATS: {Math.round(analysis.atsScore)}%</span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </motion.div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-semibold">No {activeTab.toLowerCase()} analyses found</p>
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
