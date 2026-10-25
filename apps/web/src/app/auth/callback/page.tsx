'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="glass-card relative flex w-full max-w-sm flex-col items-center gap-6 overflow-hidden px-6 py-10 text-center"
      >
        <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_0_40%,hsl(262_90%_62%)_70%,hsl(325_90%_60%)_90%,hsl(188_95%_50%)_100%)] [animation-duration:1.4s] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-3px))] [-webkit-mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-3px))]" />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
            <Brain className="h-7 w-7 text-white" />
          </div>
        </div>
        <div className="relative">
          <h1 className="font-display text-xl font-bold">Signing you in</h1>
          <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Completing sign in...
          </p>
        </div>
      </motion.div>
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
