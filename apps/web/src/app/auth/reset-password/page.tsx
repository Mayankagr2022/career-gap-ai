'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useResetPassword } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';
import { passwordSchema } from '@career-gap-ai/shared';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { mutate: resetPassword, isPending } = useResetPassword();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    const strength = passwordSchema.safeParse(password);
    if (!strength.success) {
      setError(strength.error.issues[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    resetPassword({ token, password });
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="mb-2 font-display text-2xl font-bold">Invalid Link</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary w-full py-3 inline-block">
          Request a New Link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 font-display text-2xl font-bold">Set new password</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Please enter your new password below.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 text-left">
        <div>
          <label className="mb-1.5 block text-sm font-medium">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field"
            required
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={isPending} className="btn-primary w-full py-3 mt-2">
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-500/8 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold gradient-text">CareerGap AI</span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass-card p-8 text-center">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
