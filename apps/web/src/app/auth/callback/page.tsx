'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api-client';
import { TOKEN_MODE, setTokens } from '@/lib/token-store';
import { toast } from 'sonner';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    if (searchParams.get('error')) {
      toast.error('OAuth login failed. Please try again.');
      router.replace('/auth/login');
      return;
    }

    // Token mode: the API sends the tokens after "#", which is never sent to a server or written to a log.
    // Take them and remove them from the address bar.
    if (TOKEN_MODE) {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = fragment.get('accessToken');
      const refreshToken = fragment.get('refreshToken');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!accessToken || !refreshToken) {
        toast.error('Invalid callback: missing tokens.');
        router.replace('/auth/login');
        return;
      }
      setTokens({ accessToken, refreshToken });
    }

    // Cookie mode: the API has already set its cookies. Either way, ask who we are now signed in as.
    api
      .get<{ id: string; email: string; name: string; avatar?: string | null; role: string; provider: string }>('/auth/user')
      .then((user) => {
        setAuth(user);
        toast.success(`Welcome, ${user.name}!`);
        router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
      })
      .catch(() => {
        toast.error('Could not verify your session. Please log in again.');
        router.replace('/auth/login');
      });
  }, [searchParams, router, setAuth]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500">
          <Brain className="h-7 w-7 text-white" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Completing sign in...</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}
