'use client';

import Link from 'next/link';
import { AuthShell } from '../_components/auth-shell';
import { RegisterForm } from '../_components/register-form';

export default function RegisterPage() {
  return (
    <AuthShell>
      <h1 className="mb-2 font-display text-3xl font-bold">Create your account</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Free to start. No credit card required.
      </p>

      <RegisterForm />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-brand-300 hover:text-brand-200">Terms</Link> and{' '}
        <Link href="/privacy" className="text-brand-300 hover:text-brand-200">Privacy Policy</Link>.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-brand-300 hover:text-brand-200">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
