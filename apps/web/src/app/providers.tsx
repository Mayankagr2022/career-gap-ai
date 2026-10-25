'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';

import { getSessionHint, useAuthStore } from '@/stores/auth.store';
import { TOKEN_MODE, getTokens } from '@/lib/token-store';
import { api } from '@/lib/api-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      {children}
      {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryClientProvider>
  );
}
