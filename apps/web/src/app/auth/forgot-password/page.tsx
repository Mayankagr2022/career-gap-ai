'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useForgotPassword } from '@/hooks/use-auth';
import { AuthShell } from '../_components/auth-shell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { mutate: forgotPassword, isPending, isSuccess } = useForgotPassword();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPassword(email);
  };

  return (
    <AuthShell>
      {isSuccess ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 animate-pulse-ring items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30">
            <Mail className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="mb-2 font-display text-3xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for {email}, we&apos;ve sent you a secure link to reset your password.
            </p>
          </div>
          <Link href="/auth/login" className="btn-secondary w-full py-3">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="mb-2 font-display text-3xl font-bold">Reset your password</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" disabled={isPending || !email} className="btn-primary w-full py-3">
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href="/auth/login" className="font-medium text-brand-300 hover:text-brand-200">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
