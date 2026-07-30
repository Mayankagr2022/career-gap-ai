'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import dynamic from 'next/dynamic';

const Sidebar = dynamic(() => import('./_components/sidebar').then(mod => mod.Sidebar), {
  loading: () => <div className="hidden lg:block w-[72px] h-screen bg-background/50 border-r border-foreground/[0.05]" />
});

const Header = dynamic(() => import('./_components/header').then(mod => mod.Header), {
  loading: () => <div className="h-16 w-full border-b border-foreground/[0.05] bg-background/50" />
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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header setIsMobileMenuOpen={setIsMobileMenuOpen} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
