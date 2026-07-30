'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationsDropdown } from '@/components/notifications-dropdown';
import { NAV_ITEMS } from './sidebar';

interface HeaderProps {
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export function Header({ setIsMobileMenuOpen }: HeaderProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-foreground/[0.05] bg-background/50 px-4 md:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:bg-foreground/5 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold text-muted-foreground hidden sm:block">
          {NAV_ITEMS.find((n) => isActive(n.href, n.exact))?.label || (pathname.includes('/settings') ? 'Settings' : 'Dashboard')}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationsDropdown />
      </div>
    </header>
  );
}
