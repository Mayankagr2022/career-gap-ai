'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, BarChart3, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNavActive } from './sidebar';

const TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home', exact: true },
  { href: '/dashboard/resumes', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/analyses', icon: BarChart3, label: 'Analyses' },
  { href: '/dashboard/coach', icon: MessageSquare, label: 'Coach' },
];

/** Thumb-reach navigation for phones. The "More" tab opens the full drawer. */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-3 bottom-3 z-30 md:hidden"
    >
      <div className="flex items-stretch justify-between rounded-3xl border border-white/10 bg-card/85 p-1.5 shadow-[0_20px_50px_-10px_hsl(262_90%_30%/0.8)] backdrop-blur-2xl">
        {TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href, tab.exact);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition-colors',
                active ? 'text-white' : 'text-muted-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand-500/45 to-violet-500/20 shadow-[0_0_0_1px_hsl(262_90%_66%/0.45)_inset]"
                />
              )}
              <tab.icon className="relative z-10 h-5 w-5" />
              <span className="relative z-10">{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMore}
          className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium text-muted-foreground transition-colors active:text-white"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
