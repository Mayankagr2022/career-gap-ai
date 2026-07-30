import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@career-gap-ai/shared';
import { OAuthButtons } from './oauth-buttons';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending, isSuccess } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema as any),
  });

  const onSubmit = (data: LoginInput) => login(data);

  return (
    <>
      <OAuthButtons mode="login" />

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-muted-foreground">
          <span className="bg-card px-4">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="input-field"
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <button type="submit" disabled={isPending || isSuccess} className="btn-primary w-full py-3">
          {isPending || isSuccess ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {isSuccess ? 'Redirecting...' : 'Signing in...'}</>
          ) : (
            <>Sign In <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>
    </>
  );
}
