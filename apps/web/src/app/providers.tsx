'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';

import { ThemeProvider } from '@/components/theme-provider';
import { useAuthStore } from '@/stores/auth.store';
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
