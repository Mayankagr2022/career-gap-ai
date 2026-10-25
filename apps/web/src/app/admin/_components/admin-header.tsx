'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, BarChart3, LayoutDashboard, LogOut, ScrollText, Settings, TerminalSquare, Users } from 'lucide-react';
import { getApiUrl } from '@/lib/api-client';
import { useLogout } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth.store';
import { StatusDot } from '@/components/admin/admin-ui';
import { cn, getInitials } from '@/lib/utils';

export const ADMIN_TABS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

/** Probes the API's readiness endpoint and reports its round-trip time. */
function useApiHealth() {
  return useQuery({
    queryKey: ['admin-health'],
    refetchInterval: 30_000,
    retry: false,
    queryFn: async () => {
      const t0 = performance.now();
      const res = await fetch(`${getApiUrl()}/health/ready`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return { ms: Math.round(performance.now() - t0) };
    },
  });
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="w-[4.5rem]" />;
  return <span className="font-mono text-xs tabular-nums text-muted-foreground">{now.toLocaleTimeString('en-GB')}</span>;
}

export function AdminHeader() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const health = useApiHealth();

  const state = health.isLoading ? 'idle' : health.isError ? 'down' : (health.data?.ms ?? 0) > 800 ? 'warn' : 'ok';
  const label = state === 'idle' ? 'checking' : state === 'down' ? 'api down' : state === 'warn' ? 'degraded' : 'operational';
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.09] bg-background/95">
      {/* Row 1: identity, system status, session */}
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TerminalSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-mono text-sm font-bold tracking-[0.14em]">CAREERGAP<span className="text-primary">{'//'}</span>ADMIN</div>
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">control room</div>
          </div>
        </div>

        <div className="hidden items-center gap-4 rounded-md border border-white/10 bg-black/30 px-3 py-1.5 md:flex">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <StatusDot state={state} />
            {label}
          </span>
          {health.data && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <Activity className="h-3 w-3" />
              {health.data.ms}ms
            </span>
          )}
          <span className="h-3 w-px bg-white/15" />
          <Clock />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/dashboard" className="hidden items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:flex">
            <ArrowLeft className="h-3.5 w-3.5" />
            User app
          </Link>
          <button
            onClick={() => logout()}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-rose-500/50 hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
          {user && (
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-400/40 bg-amber-400/10 font-mono text-xs font-bold text-amber-300" title={user.email}>
              {getInitials(user.name)}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: section tabs (scroll sideways on phones) */}
      <nav className="flex gap-1 overflow-x-auto px-3 sm:px-5" aria-label="Admin sections">
        {ADMIN_TABS.map((tab) => {
          const active = isActive(tab.href, tab.exact);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex shrink-0 items-center gap-2 px-3.5 py-3 font-mono text-xs uppercase tracking-wider transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary shadow-[0_0_10px_hsl(152_76%_46%)]" />}
            </Link>
          );
        })}
        <Link href="/dashboard" className="ml-auto flex shrink-0 items-center gap-2 px-3.5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground sm:hidden">
          <ArrowLeft className="h-3.5 w-3.5" />
          User app
        </Link>
      </nav>
    </header>
  );
}
