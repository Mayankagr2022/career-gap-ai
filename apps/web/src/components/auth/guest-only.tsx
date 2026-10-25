'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSessionHint, useAuthStore } from '@/stores/auth.store';
import { postLoginTarget } from '@/lib/auth-redirect';
import { AuthStatusScreen } from './auth-status-screen';

/** Auth pages that must stay reachable while signed in (the OAuth callback finishes its own redirect). */
const ALWAYS_REACHABLE = ['/auth/callback', '/auth/reset-password'];

/**
 * Keeps signed-in people off the sign-in and sign-up pages: a user is sent to the dashboard, an admin to the admin
 * console (or to the page they were heading to, from `?next=`).
 *
 * The first render shows the page itself, so it matches the static HTML and visitors who are signed out see no delay.
 * Only after mounting, and only if the visitor might be signed in, a cover screen hides the form until the session
 * check finishes, so the form never flashes before the redirect.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const exempt = ALWAYS_REACHABLE.some((p) => pathname.startsWith(p));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (exempt || !isInitialized || !isAuthenticated || !user) return;
    router.replace(postLoginTarget(user.role));
  }, [exempt, isInitialized, isAuthenticated, user, router]);

  if (exempt || !mounted) return <>{children}</>;

  const redirecting = isInitialized && isAuthenticated;
  // Not known to be signed out, and the session check has not finished yet
  const checking = !isInitialized && getSessionHint() !== '0';

  return (
    <>
      {children}
      {(redirecting || checking) && (
        <AuthStatusScreen message={redirecting ? "You're already signed in. Redirecting..." : 'Checking your session...'} />
      )}
    </>
  );
}
