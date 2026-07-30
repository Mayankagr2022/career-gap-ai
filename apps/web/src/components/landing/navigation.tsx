'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Brain, ArrowRight, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navigation() {
  const { isAuthenticated } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // On the home page use in-page anchors (#features).
  // On any other page prefix with / so the browser navigates home first (/#features).
  const anchorHref = (id: string) =>
    pathname === '/' ? `#${id}` : `/#${id}`;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-foreground/[0.05] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold gradient-text">CareerGap AI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href={anchorHref('features')} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</Link>
          <Link href={anchorHref('how-it-works')} className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it Works</Link>
          <Link href={anchorHref('testimonials')} className="text-sm text-muted-foreground transition-colors hover:text-foreground">Stories</Link>
          <Link href="/market" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Market Trends</Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/dashboard" className="hidden sm:flex btn-primary py-2 px-5 text-sm">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:flex btn-secondary py-2 px-5 text-sm">
                Sign In
              </Link>
              <Link href="/auth/register" className="hidden sm:flex btn-primary py-2 px-5 text-sm">
                Get Started
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:bg-foreground/5 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-foreground/[0.05] bg-background/95 backdrop-blur-xl px-6 py-4 space-y-4">
          <div className="flex flex-col space-y-3">
            <Link onClick={() => setIsMobileMenuOpen(false)} href={anchorHref('features')} className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 border-b border-foreground/[0.05]">Features</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href={anchorHref('how-it-works')} className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 border-b border-foreground/[0.05]">How it Works</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href={anchorHref('testimonials')} className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 border-b border-foreground/[0.05]">Stories</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/market" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 border-b border-foreground/[0.05]">Market Trends</Link>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary py-3 w-full justify-center">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="btn-secondary py-3 w-full justify-center">
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary py-3 w-full justify-center">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
