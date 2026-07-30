'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold">Something went critically wrong</h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            We encountered a critical error. Our team has been notified. Please try refreshing the page.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => reset()}
              className="btn-primary"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
