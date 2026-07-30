'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useResumes, useUploadResume, useDeleteResume } from '@/hooks/use-resumes';
import { createPortal } from 'react-dom';
import { ResumeUploader } from './_components/resume-uploader';
import { ResumeList } from './_components/resume-list';
import { ResumeDetailModal } from './_components/resume-detail-modal';

export default function ResumesPage() {
  const { data: resumes, isLoading } = useResumes();
  const { mutate: upload } = useUploadResume();
  const { mutate: deleteResume } = useDeleteResume();
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-48 shimmer rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Resumes</h1>
        <p className="mt-1 text-muted-foreground">Upload and manage your resumes for AI analysis</p>
      </div>

      {/* Upload zone */}
      <ResumeUploader onUpload={upload} />

      {/* Resume list */}
      <ResumeList
        resumes={resumes || []}
        onView={setSelectedResume}
        onDelete={deleteResume}
      />

      {/* Resume detail modal */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedResume && (
            <ResumeDetailModal
              resume={selectedResume}
              onClose={() => setSelectedResume(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
