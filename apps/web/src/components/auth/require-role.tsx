'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccess } from '@/hooks/use-access';

interface RequireRoleProps {
  role: string;
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { hasRole, isInitialized, isAuthenticated } = useAccess();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (!hasRole(role)) {
        router.push('/dashboard');
      }
    }
  }, [isInitialized, isAuthenticated, hasRole, role, router]);

  if (!isInitialized || !isAuthenticated || !hasRole(role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
