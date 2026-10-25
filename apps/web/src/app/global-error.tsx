'use client';

import { useEffect } from 'react';
import type { CSSProperties } from 'react';

// global-error renders its own <html>/<body> outside the app layout, so it is fully self-contained (inline dark styles).
const page: CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
  background:
    'radial-gradient(40% 35% at 20% 10%, rgba(124,58,237,0.30), transparent 70%), radial-gradient(38% 34% at 80% 90%, rgba(236,72,153,0.20), transparent 70%), #07050f',
  color: '#f4f3fb',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  textAlign: 'center',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  boxSizing: 'border-box',
  padding: '40px 28px',
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
  boxShadow: '0 30px 80px -20px rgba(124,58,237,0.45)',
};

const numeral: CSSProperties = {
  fontSize: 88,
  fontWeight: 800,
  lineHeight: 1,
  margin: 0,
  backgroundImage: 'linear-gradient(110deg, #c4b5fd, #f9a8d4 50%, #67e8f9)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
};

const btnBase: CSSProperties = {
  minHeight: 44,
  padding: '0 24px',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#fff',
};

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
    <html lang="en" className="dark" style={{ background: '#07050f', colorScheme: 'dark' }}>
      <body style={page}>
        <div style={card}>
          <p style={numeral}>500</p>
          <h1 style={{ margin: '20px 0 8px', fontSize: 24, fontWeight: 700 }}>Something went critically wrong</h1>
          <p style={{ margin: '0 auto 28px', maxWidth: 380, fontSize: 14, lineHeight: 1.6, color: '#9d99b8' }}>
            We encountered a critical error. Our team has been notified. Please try refreshing the page.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                ...btnBase,
                border: 'none',
                backgroundImage: 'linear-gradient(120deg, #7c3aed, #c026d3 50%, #ec4899)',
                boxShadow: '0 8px 28px -8px rgba(124,58,237,0.7)',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ ...btnBase, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
