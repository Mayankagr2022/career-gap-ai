'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, FileText, Briefcase, BarChart3,
  Lightbulb, Map, TrendingUp, Settings, MessageSquare,
  LogOut, X, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/hooks/use-auth';
import { cn, getInitials } from '@/lib/utils';

export const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/resumes', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/dashboard/analyses', icon: BarChart3, label: 'Analyses' },
  { href: '/dashboard/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { href: '/dashboard/roadmaps', icon: Map, label: 'Roadmaps' },
  { href: '/dashboard/coach', icon: MessageSquare, label: 'AI Coach' },
  { href: '/dashboard/market', icon: TrendingUp, label: 'Market Trends' },
];

export function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, previewAvatar } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  if (!user) return null;

  const items = [...NAV_ITEMS, { href: '/dashboard/settings', icon: Settings, label: 'Settings', exact: false }];

  return (
    <>
      {/* Phone drawer backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Reserves the rail's width on tablet/desktop so the hover-expanded panel can float over the content */}
      <div className="hidden w-[88px] shrink-0 md:block" aria-hidden />

      <aside
        className={cn(
          'group fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden transition-[width,transform] duration-300 ease-out',
          // phones: slide-in drawer. md and up: floating glass rail that expands on hover or keyboard focus.
          'w-[18rem] border-r border-white/10 bg-card/95 backdrop-blur-2xl',
          'md:inset-y-3 md:left-3 md:w-[64px] md:rounded-3xl md:border md:bg-card/70 md:shadow-[0_20px_60px_-20px_hsl(262_90%_40%/0.55)]',
          'md:hover:w-[16.5rem] md:focus-within:w-[16.5rem]',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Top glow strip */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />

        <div className="flex h-16 shrink-0 items-center justify-between px-3.5 md:px-[13px]">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
              <Brain className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="whitespace-nowrap font-display text-lg font-bold gradient-text opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              CareerGap AI
            </span>
          </Link>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/10 hover:text-foreground md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          {items.map((item, idx) => {
            const active = isNavActive(pathname, item.href, item.exact);
            return (
              <div key={item.href}>
                {item.href === '/dashboard/settings' && (
                  <div className="mx-2 my-3 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                )}
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'relative flex items-center gap-3 overflow-hidden rounded-xl px-[13px] py-2.5 text-sm font-medium transition-colors duration-200',
                    active ? 'text-white' : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
                  )}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/40 via-brand-500/20 to-violet-500/15 shadow-[0_0_0_1px_hsl(262_90%_66%/0.4)_inset,0_10px_30px_-12px_hsl(262_90%_66%/0.9)]"
                    />
                  )}
                  <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
                    <item.icon className={cn('h-5 w-5 transition-transform duration-300', active && 'scale-110 text-brand-200')} />
                  </span>
                  <span className="relative z-10 whitespace-nowrap opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="shrink-0 p-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-2 transition-colors hover:bg-white/[0.07]">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
              {previewAvatar || user.avatar ? (
                <Image src={previewAvatar || user.avatar!} alt={user.name} fill sizes="36px" className="object-cover" priority unoptimized />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="min-w-0 flex-1 whitespace-nowrap opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
            <button
              onClick={() => logout()}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-100 transition-all duration-300 hover:bg-red-500/15 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              title="Logout"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout loading backdrop */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
            <p className="animate-pulse font-medium">Logging out...</p>
          </div>
        </div>
      )}
    </>
  );
}
