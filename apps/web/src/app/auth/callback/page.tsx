'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error) {
      toast.error('OAuth login failed. Please try again.');
      router.push('/auth/login');
      return;
    }

    if (!token || !refresh) {
      toast.error('Invalid callback — missing tokens.');
      router.push('/auth/login');
      return;
    }

    // Fetch the user profile with the token we just received
    apiClient
      .get<{ data: { id: string; email: string; name: string; avatar?: string | null; role: string; provider: string } }>(
        '/auth/user',
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((res) => {
        setAuth(res.data.data);
        toast.success(`Welcome, ${res.data.data.name}!`);
        router.push('/dashboard');
      })
      .catch(() => {
        toast.error('Could not verify your session. Please log in again.');
        router.push('/auth/login');
      });
  }, [searchParams, router, setAuth]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500">
          <Brain className="h-7 w-7 text-white" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Completing sign-in…</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
