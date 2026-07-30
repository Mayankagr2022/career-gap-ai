'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useForgotPassword } from '@/hooks/use-auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { mutate: forgotPassword, isPending, isSuccess } = useForgotPassword();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPassword(email);
  };

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
          {isSuccess ? (
            <div className="space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Mail className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="mb-2 font-display text-2xl font-bold">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  If an account exists for {email}, we've sent you a secure link to reset your password.
                </p>
              </div>
              <Link href="/auth/login" className="btn-secondary w-full py-3">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 font-display text-2xl font-bold">Reset your password</h1>
              <p className="mb-8 text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-4 text-left">
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

              <p className="mt-6 text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
