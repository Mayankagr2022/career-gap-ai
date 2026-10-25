'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { Upload, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadJobFile, useConfirmJobUpload, JobUploadDraft } from '@/hooks/use-jobs';

const MAX_SIZE = 5 * 1024 * 1024;

function Dropzone({ onUpload, isPending }: { onUpload: (file: File) => void; isPending: boolean }) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) onUpload(files[0]);
    },
    [onUpload],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    toast.error(
      code === 'file-too-large' ? 'File is too large. Maximum size is 5MB.'
        : code === 'file-invalid-type' ? 'Only PDF, DOCX and TXT files are allowed.'
        : code === 'too-many-files' ? 'Please upload one file at a time.'
        : rejections[0]?.errors[0]?.message || 'This file cannot be uploaded.',
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: MAX_SIZE,
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-200',
        isDragActive
          ? 'border-brand-500/60 bg-brand-500/5'
          : 'border-border hover:border-brand-500/30 hover:bg-foreground/[0.02]',
        isPending && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {isPending ? (
        <>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-brand-400" />
          <p className="text-sm font-medium text-brand-300">Reading the file...</p>
        </>
      ) : (
        <>
          <div className={cn(
            'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform',
            isDragActive ? 'scale-110 bg-brand-500/20' : 'bg-muted',
          )}>
            <Upload className={cn('h-6 w-6', isDragActive ? 'text-brand-400' : 'text-muted-foreground')} />
          </div>
          <p className="mb-1 text-base font-semibold">
            {isDragActive ? 'Drop the job description here' : 'Upload a job description'}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag & drop or <span className="text-brand-400">browse</span> • PDF, DOCX, TXT up to 5MB
          </p>
        </>
      )}
    </div>
  );
}

function Review({
  draft,
  onReset,
  onCancel,
  onDone,
}: {
  draft: JobUploadDraft;
  onReset: () => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { mutate: confirm, isPending } = useConfirmJobUpload();
  const [title, setTitle] = useState(draft.title ?? '');
  const [company, setCompany] = useState(draft.company ?? '');

  const canSave = title.trim().length >= 2 && company.trim().length >= 1;

  const save = () => {
    confirm(
      { draftId: draft.draftId, title: title.trim(), company: company.trim() },
      {
        onSuccess: onDone,
        // An expired draft cannot be saved; send the user back to upload again
        onError: (error: any) => {
          if (error?.response?.status === 404) onReset();
        },
      },
    );
  };

  const hint = (detected: string | null) =>
    detected ? 'Detected from the file. Please check it.' : "Couldn't detect this. Please enter it.";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-brand-400" />
          <span className="truncate">{draft.filename}</span>
        </span>
        <button type="button" onClick={onReset} disabled={isPending} className="shrink-0 text-xs text-brand-400 hover:underline">
          Choose a different file
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Job Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="input-field"
            placeholder="Senior Software Engineer"
          />
          <p className="mt-1 text-xs text-muted-foreground">{hint(draft.title)}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Company *</label>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            maxLength={200}
            className="input-field"
            placeholder="Google"
          />
          <p className="mt-1 text-xs text-muted-foreground">{hint(draft.company)}</p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium">Job Description</label>
          <span className="text-xs text-muted-foreground">{draft.description.length} chars • read-only</span>
        </div>
        <textarea
          value={draft.description}
          readOnly
          rows={10}
          className="input-field resize-none opacity-80"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Skills, location, salary and the rest are extracted by AI when you save.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={isPending} className="btn-secondary flex-1 py-3">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!canSave || isPending} className="btn-primary flex-1 py-3">
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> AI Parsing...</>
          ) : (
            <>Save Job</>
          )}
        </button>
      </div>
    </div>
  );
}

export function JobFileUpload({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const { mutate: upload, isPending } = useUploadJobFile();
  const [draft, setDraft] = useState<JobUploadDraft | null>(null);

  if (draft) {
    return <Review draft={draft} onReset={() => setDraft(null)} onCancel={onCancel} onDone={onDone} />;
  }

  return (
    <div className="space-y-4">
      <Dropzone isPending={isPending} onUpload={(file) => upload(file, { onSuccess: setDraft })} />
      <button type="button" onClick={onCancel} className="btn-secondary w-full py-3">
        Cancel
      </button>
    </div>
  );
}
