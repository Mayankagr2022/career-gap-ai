import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadResume } from '@/hooks/use-resumes';

export function ResumeUploader({ onUpload }: { onUpload: (file: File) => void }) {
  const { isPending } = useUploadResume();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: isPending,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200',
        isDragActive
          ? 'border-brand-500/60 bg-brand-500/5'
          : 'border-border hover:border-brand-500/30 hover:bg-foreground/[0.02]',
        isPending && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {isPending ? (
        <>
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-brand-400" />
          <p className="text-sm font-medium text-brand-300">Uploading and processing...</p>
        </>
      ) : (
        <>
          <div className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform',
            isDragActive ? 'scale-110 bg-brand-500/20' : 'bg-muted',
          )}>
            <Upload className={cn('h-7 w-7', isDragActive ? 'text-brand-400' : 'text-muted-foreground')} />
          </div>
          <p className="mb-1 text-base font-semibold">
            {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag & drop or <span className="text-brand-400">browse</span> • PDF, DOCX up to 10MB
          </p>
        </>
      )}
    </div>
  );
}
