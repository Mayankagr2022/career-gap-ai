import { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Upload, Loader2, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResumeUploader({ onUpload, isPending }: { onUpload: (file: File) => void; isPending: boolean }) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    toast.error(
      code === 'file-too-large' ? 'File is too large. Maximum size is 10MB.'
        : code === 'file-invalid-type' ? 'Only PDF and DOCX files are allowed.'
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
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: isPending,
  });

  return (
    <div className="relative">
      {/* soft glow behind the zone */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-r from-brand-500/25 via-violet-500/20 to-cyan-400/20 blur-2xl transition-opacity duration-500',
          isDragActive || isPending ? 'opacity-100' : 'opacity-40',
        )}
      />
      <div
        {...getRootProps()}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-3xl p-[2px] transition-transform duration-300',
          isDragActive && 'scale-[1.01]',
          isPending && 'pointer-events-none',
        )}
        style={{
          backgroundImage: isDragActive
            ? 'linear-gradient(120deg, hsl(262 90% 66%), hsl(325 90% 60%), hsl(188 95% 50%))'
            : 'repeating-linear-gradient(135deg, hsl(262 90% 66% / 0.7) 0 10px, transparent 10px 18px)',
        }}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            'relative flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-[calc(1.5rem-2px)] bg-card/95 px-5 py-10 text-center sm:min-h-[17rem] sm:px-10',
            isDragActive && 'bg-card/80',
          )}
        >
          {isPending ? (
            <>
              <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/30" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              </div>
              <p className="font-display text-lg font-semibold">Uploading and processing...</p>
              <p className="text-sm text-muted-foreground">Our AI is reading your resume</p>
              <div className="relative mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-cyan-400"
                  animate={{ left: ['-35%', '100%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </>
          ) : (
            <>
              <motion.div
                animate={{ y: isDragActive ? -6 : [0, -6, 0] }}
                transition={isDragActive ? { duration: 0.2 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative flex h-20 w-20 items-center justify-center"
              >
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/25" />
                <div
                  className={cn(
                    'relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 shadow-glow transition-colors',
                    isDragActive ? 'bg-gradient-to-br from-brand-500 to-violet-500' : 'bg-brand-500/15',
                  )}
                >
                  {isDragActive ? (
                    <FileText className="h-8 w-8 text-white" />
                  ) : (
                    <Upload className="h-8 w-8 text-brand-300" />
                  )}
                </div>
              </motion.div>
              <p className="font-display text-xl font-semibold sm:text-2xl">
                {isDragActive ? 'Drop it like it\'s hot' : <>Drop your resume <span className="gradient-text">here</span></>}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Drag &amp; drop or <span className="font-medium text-brand-300 underline-offset-4 group-hover:underline">browse files</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">PDF</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">DOCX</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">up to 10MB</span>
                <span className="hidden items-center gap-1 text-brand-300 sm:inline-flex">
                  <Sparkles className="h-3 w-3" /> AI analysis included
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
