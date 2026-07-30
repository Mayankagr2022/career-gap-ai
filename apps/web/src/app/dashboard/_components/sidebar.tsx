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

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, previewAvatar } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-foreground/[0.05] bg-background/95 backdrop-blur-xl transition-[width,transform] duration-300 lg:static lg:bg-background/50 overflow-hidden",
          "group w-72 lg:w-[72px] hover:lg:w-64",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-foreground/[0.05]">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold gradient-text whitespace-nowrap transition-opacity duration-300 opacity-100 lg:opacity-0 group-hover:lg:opacity-100">
              CareerGap AI
            </span>
          </Link>
          <button 
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-link overflow-hidden',
                isActive(item.href, item.exact) && 'active'
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <item.icon className="h-5 w-5" />
              </div>
              <span className="whitespace-nowrap transition-opacity duration-300 opacity-100 lg:opacity-0 group-hover:lg:opacity-100">
                {item.label}
              </span>
            </Link>
          ))}
          
          <div className="my-4 border-t border-foreground/[0.05]" />
          
          <Link
            href="/dashboard/settings"
            className={cn(
              'nav-link overflow-hidden',
              isActive('/dashboard/settings') && 'active'
            )}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <span className="whitespace-nowrap transition-opacity duration-300 opacity-100 lg:opacity-0 group-hover:lg:opacity-100">
              Settings
            </span>
          </Link>
        </nav>

        {/* User profile */}
        <div className="border-t border-foreground/[0.05] p-3">
          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-foreground/5 transition-colors cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white relative overflow-hidden">
              {previewAvatar || user.avatar ? (
                <Image src={previewAvatar || user.avatar!} alt={user.name} fill sizes="32px" className="object-cover" priority unoptimized />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="min-w-0 flex-1 whitespace-nowrap transition-opacity duration-300 opacity-100 lg:opacity-0 group-hover:lg:opacity-100">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
            <button
              onClick={() => logout()}
              className="text-muted-foreground hover:text-foreground transition-all duration-300 shrink-0 opacity-100 lg:opacity-0 group-hover:lg:opacity-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Loading Backdrop */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="font-medium animate-pulse">Logging out...</p>
          </div>
        </div>
      )}
    </>
  );
}
