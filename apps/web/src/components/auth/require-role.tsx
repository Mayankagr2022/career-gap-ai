'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Brain, ShieldAlert } from 'lucide-react';
import { useAccess } from '@/hooks/use-access';
import { currentAppPath, homeFor, loginUrl } from '@/lib/auth-redirect';

interface RequireRoleProps {
  role: string;
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { hasRole, isInitialized, isAuthenticated } = useAccess();
  const router = useRouter();

  const { user } = useAccess();
  const toldUser = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      // Not signed in: sign in first, then come back to this page
      router.replace(loginUrl(currentAppPath()));
    } else if (!hasRole(role)) {
      // Signed in but not allowed: say why, then go to the page they can use
      if (!toldUser.current) {
        toldUser.current = true;
        toast.error('You do not have permission to open that page.', { id: 'forbidden-page' });
      }
      router.replace(homeFor(user?.role));
    }
  }, [isInitialized, isAuthenticated, hasRole, role, router, user?.role]);

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
