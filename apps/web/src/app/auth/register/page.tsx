'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { RegisterForm } from '../_components/register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-500/8 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold gradient-text">CareerGap AI</span>
          </Link>
        </div>

        <div className="glass-card p-8">
          <h1 className="mb-2 font-display text-2xl font-bold">Create your account</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Free to start. No credit card required.
          </p>

          <RegisterForm />

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-brand-400 hover:text-brand-300">Terms</Link> and{' '}
            <Link href="/privacy" className="text-brand-400 hover:text-brand-300">Privacy Policy</Link>.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
