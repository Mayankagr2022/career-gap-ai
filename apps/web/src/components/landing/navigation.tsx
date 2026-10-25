'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

export function Navigation() {
  const { isAuthenticated } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On the home page use in-page anchors (#features).
  // On any other page prefix with / so the browser navigates home first (/#features).
  const anchorHref = (id: string) => (pathname === '/' ? `#${id}` : `/#${id}`);

  const links = [
    { href: anchorHref('features'), label: 'Features' },
    { href: anchorHref('how-it-works'), label: 'How it Works' },
    { href: anchorHref('testimonials'), label: 'Stories' },
    { href: '/market', label: 'Market Trends' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        className={cn(
          'mx-auto max-w-6xl rounded-2xl border transition-all duration-300',
          scrolled || isMobileMenuOpen
            ? 'border-white/10 bg-background/70 shadow-[0_20px_50px_-20px_hsl(262_90%_40%/0.6)] backdrop-blur-2xl'
            : 'border-transparent bg-transparent'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <BrandLogo />

          <div className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary hidden px-5 py-2 text-sm sm:inline-flex">
                Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="hidden px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary hidden px-5 py-2 text-sm sm:inline-flex">
                  Get Started
                </Link>
              </>
            )}

            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:text-foreground md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden md:hidden"
            >
              <div className="space-y-1 border-t border-white/[0.08] px-4 py-4">
                {links.map((l) => (
                  <Link
                    key={l.label}
                    onClick={() => setIsMobileMenuOpen(false)}
                    href={l.href}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 pt-3">
                  {isAuthenticated ? (
                    <Link href="/dashboard" className="btn-primary w-full py-3">Go to Dashboard</Link>
                  ) : (
                    <>
                      <Link href="/auth/login" className="btn-secondary w-full py-3">Sign In</Link>
                      <Link href="/auth/register" className="btn-primary w-full py-3">Get Started Free</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
