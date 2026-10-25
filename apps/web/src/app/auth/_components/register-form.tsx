import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useRegister } from '@/hooks/use-auth';
import { registerSchema, type RegisterInput } from '@career-gap-ai/shared';
import { OAuthButtons } from './oauth-buttons';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: registerMutation, isPending, isSuccess } = useRegister();

  const {
    register: form,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema as any),
  });

  const password = watch('password', '');
  const onSubmit = (data: RegisterInput) => registerMutation(data);

  return (
    <>
      <OAuthButtons mode="register" />

      <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
        <span>or with email</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Full Name</label>
          <input
            {...form('name')}
            type="text"
            placeholder="John Doe"
            className="input-field"
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            {...form('email')}
            type="email"
            placeholder="you@example.com"
            className="input-field"
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <div className="relative">
            <input
              {...form('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Password strength */}
          {password && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {PASSWORD_REQUIREMENTS.map((req) => (
                <div
                  key={req.label}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    req.test(password) ? 'text-emerald-400' : 'text-muted-foreground'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {req.label}
                </div>
              ))}
            </div>
          )}
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <button type="submit" disabled={isPending || isSuccess} className="btn-primary w-full py-3">
          {isPending || isSuccess ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {isSuccess ? 'Redirecting...' : 'Creating account...'}</>
          ) : (
            <>Create Account <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>
    </>
  );
}
