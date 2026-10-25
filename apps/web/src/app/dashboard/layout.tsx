'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import dynamic from 'next/dynamic';
import { BottomNav } from './_components/bottom-nav';

const Sidebar = dynamic(() => import('./_components/sidebar').then(mod => mod.Sidebar), {
  loading: () => <div className="hidden w-[88px] shrink-0 md:block" />
});

const Header = dynamic(() => import('./_components/header').then(mod => mod.Header), {
  loading: () => <div className="h-16 w-full" />
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Redirect if not authenticated after initialization check
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-400 border-r-violet-500" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-brand-500 to-violet-500 opacity-80 blur-[2px]" />
          </div>
          <p className="animate-pulse text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <Header />
          {/* Bottom padding clears the phone tab bar */}
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-2 sm:px-6 md:pb-10 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <BottomNav onMore={() => setIsMobileMenuOpen(true)} />
    </div>
  );
}
