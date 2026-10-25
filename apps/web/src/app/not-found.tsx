'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Compass, Home } from 'lucide-react';

// Analyses used to live at /dashboard/analyses/<id>. The detail page is now /dashboard/analyses/view?id=<id> (a statically
// hosted site cannot have a page per id), so an old address that reaches this page is forwarded to the new one.
const OLD_ANALYSIS_PATH = /^\/dashboard\/analyses\/([0-9a-f-]{36})\/?$/i;

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const oldId = OLD_ANALYSIS_PATH.exec(pathname ?? '')?.[1];

  useEffect(() => {
    if (oldId) router.replace(`/dashboard/analyses/view?id=${oldId}`);
  }, [oldId, router]);

  if (oldId) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card relative w-full max-w-lg overflow-hidden px-6 py-10 sm:px-10"
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex items-center justify-center gap-1 sm:gap-2">
          <span className="gradient-text font-display text-8xl font-extrabold leading-none sm:text-9xl">4</span>
          <div className="flex h-20 w-20 animate-float items-center justify-center rounded-full bg-gradient-to-br from-brand-500/30 to-violet-500/30 ring-1 ring-white/10 shadow-glow-lg sm:h-24 sm:w-24">
            <Compass className="h-10 w-10 text-brand-200 sm:h-12 sm:w-12" />
          </div>
          <span className="gradient-text font-display text-8xl font-extrabold leading-none sm:text-9xl">4</span>
        </div>
        <h1 className="relative mt-6 font-display text-2xl font-bold sm:text-3xl">Page not found</h1>
        <p className="relative mx-auto mb-8 mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          The page you are looking for does not exist or has moved.
        </p>
        <Link href="/" className="btn-primary relative min-h-[44px] px-6 py-2.5 text-sm">
          <Home className="h-4 w-4" />
          Go to the home page
        </Link>
      </motion.div>
    </div>
  );
}
