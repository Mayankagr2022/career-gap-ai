'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { usePathname } from 'next/navigation';

export function AdminHeader() {
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.includes('/users')) return 'User Management';
    if (pathname.includes('/settings')) return 'System Settings';
    return 'Admin Dashboard';
  };

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground hidden sm:block">
          {getTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
