'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
      </div>
      <h2 className="mb-2 font-display text-2xl font-bold">Oops! Something went wrong</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        We encountered an unexpected error while trying to load this page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary"
        >
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go back home
        </Link>
      </div>
    </div>
  );
}
