'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';

import { getSessionHint, useAuthStore } from '@/stores/auth.store';
import { TOKEN_MODE, getTokens } from '@/lib/token-store';
import { api } from '@/lib/api-client';
import { AuthSync } from '@/components/auth/auth-sync';

// A 403 can mean the account's role changed while the page was open. Re-read the user (at most every 10 s) so the
// role-based guards react, instead of leaving a page open that the user can no longer use.
let lastRoleRefresh = 0;
function onForbidden() {
  toast.error('You do not have permission to do that.', { id: 'forbidden' });
  if (Date.now() - lastRoleRefresh < 10_000) return;
  lastRoleRefresh = Date.now();
  api.get<any>('/auth/user').then((user) => useAuthStore.getState().setAuth(user)).catch(() => {});
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: any) => {
            if (error?.response?.status === 403) onForbidden();
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    const initAuth = async () => {
      // A visitor known to be signed out has no session to look up: no request, no 401, no refresh attempt
      if (getSessionHint() === '0' || (TOKEN_MODE && !getTokens())) {
        useAuthStore.getState().clearAuth();
        useAuthStore.getState().setInitialized(true);
        return;
      }
      try {
        const user = await api.get<any>('/auth/user');
        useAuthStore.getState().setAuth(user);
      } catch (error) {
        useAuthStore.getState().clearAuth();
      } finally {
        useAuthStore.getState().setInitialized(true);
      }
    };
    initAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      {children}
      {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryClientProvider>
  );
}
