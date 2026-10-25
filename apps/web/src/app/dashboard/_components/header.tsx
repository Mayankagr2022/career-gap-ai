'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Brain } from 'lucide-react';
import { NotificationsDropdown } from '@/components/notifications-dropdown';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials } from '@/lib/utils';
import { NAV_ITEMS, isNavActive } from './sidebar';

export function Header() {
  const pathname = usePathname();
  const { user, previewAvatar } = useAuthStore();

  const title =
    NAV_ITEMS.find((n) => isNavActive(pathname, n.href, n.exact))?.label ||
    (pathname.includes('/settings') ? 'Settings' : 'Dashboard');
  const firstName = user?.name?.split(' ')[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      {/* Frosted bar that fades into the page */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/70 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]" />

      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow md:hidden">
          <Brain className="h-[18px] w-[18px] text-white" />
        </Link>
        <div className="min-w-0">
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </p>
          <h2 className="truncate font-display text-lg font-semibold leading-tight sm:text-xl">{title}</h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.04]">
          <NotificationsDropdown />
        </div>
        {user && (
          <Link
            href="/dashboard/settings"
            aria-label="Account settings"
            className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white ring-2 ring-white/10 transition hover:ring-brand-400/60"
          >
            {previewAvatar || user.avatar ? (
              <Image src={previewAvatar || user.avatar!} alt={user.name} fill sizes="36px" className="object-cover" unoptimized />
            ) : (
              getInitials(user.name)
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
