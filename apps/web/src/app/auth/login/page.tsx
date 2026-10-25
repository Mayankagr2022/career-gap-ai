'use client';

import Link from 'next/link';
import { AuthShell } from '../_components/auth-shell';
import { LoginForm } from '../_components/login-form';

export default function LoginPage() {
  return (
    <AuthShell>
      <h1 className="mb-2 font-display text-3xl font-bold">Welcome back</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Sign in to continue your career journey
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="font-medium text-brand-300 hover:text-brand-200">
          Sign up free
        </Link>
      </p>
    </AuthShell>
  );
}
