'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App unhandled error:', error);
  }, [error]);

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card relative w-full max-w-lg overflow-hidden px-6 py-10 sm:px-10"
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" />
        <p className="gradient-text relative font-display text-7xl font-extrabold leading-none sm:text-8xl">500</p>
        <div className="relative mx-auto my-6 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 to-violet-500/25 ring-1 ring-white/10 shadow-glow">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
        </div>
        <h2 className="relative mb-2 font-display text-2xl font-bold">Oops! Something went wrong</h2>
        <p className="relative mx-auto mb-8 max-w-md text-sm text-muted-foreground sm:text-base">
          We encountered an unexpected error while trying to load this page.
        </p>
        <div className="relative flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <button onClick={() => reset()} className="btn-primary min-h-[44px]">
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link href="/" className="btn-secondary min-h-[44px]">
            <Home className="h-4 w-4" />
            Go back home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
