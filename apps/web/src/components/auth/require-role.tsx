'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, ShieldAlert } from 'lucide-react';
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
    const denied = isInitialized && isAuthenticated && !hasRole(role);
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card flex w-full max-w-xs flex-col items-center gap-5 px-6 py-8 text-center"
        >
          {denied ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-300 ring-1 ring-red-400/20">
              <ShieldAlert className="h-7 w-7" />
            </div>
          ) : (
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-brand-400 border-r-violet-400" />
              <Brain className="h-6 w-6 text-brand-200" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {denied ? 'Access denied. Redirecting...' : 'Verifying access...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
