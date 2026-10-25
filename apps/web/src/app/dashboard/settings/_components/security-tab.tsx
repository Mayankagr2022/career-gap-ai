'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, KeyRound, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { passwordSchema as sharedPasswordSchema } from '@career-gap-ai/shared';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: sharedPasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function SecurityTab() {
  const { user } = useAuthStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema as any)
  });

  const { mutate: updatePassword, isPending: isUpdatingPassword } = useMutation({
    mutationFn: (data: any) => api.put('/users/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      reset();
      toast.success('Password updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.message?.[0] || 'Failed to update password')
  });

  const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
    mutationFn: () => api.delete('/users/account'),
    onSuccess: () => {
      toast.success('Account deleted');
      window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/`; // full reload, under the site's base path
    }
  });

  return (
    <div className="space-y-6">
      {user?.provider === 'LOCAL' ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-5 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">Change Password</h2>
          </div>
          <form onSubmit={handleSubmit((data) => updatePassword(data))} className="max-w-md space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Password</label>
              <input {...register('currentPassword')} type="password" className="input-field" />
              {errors.currentPassword && <p className="mt-1 text-xs text-red-400">{errors.currentPassword.message as string}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New Password</label>
              <input {...register('newPassword')} type="password" className="input-field" />
              {errors.newPassword && <p className="mt-1 text-xs text-red-400">{errors.newPassword.message as string}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
              <input {...register('confirmPassword')} type="password" className="input-field" />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message as string}</p>}
            </div>
            <button type="submit" disabled={isUpdatingPassword} className="btn-primary mt-2 min-h-[44px] w-full sm:w-auto">
              {isUpdatingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</> : 'Update Password'}
            </button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card flex items-start gap-4 p-5 sm:p-8"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="mb-1 font-display text-lg font-semibold">Password</h2>
            <p className="text-sm text-muted-foreground">
              You are logged in using {user?.provider}. Passwords are managed by your provider.
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="glass-card relative overflow-hidden !border-red-500/25 p-5 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-red-500/15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400 ring-1 ring-red-400/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="mb-1 font-display text-lg font-semibold text-red-400">Danger Zone</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your account and all associated data, including resumes, analyses, and roadmaps.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
                  deleteAccount();
                }
              }}
              disabled={isDeleting}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-sm font-medium text-red-300 transition-all hover:-translate-y-0.5 hover:bg-red-500/20 hover:shadow-[0_10px_30px_-12px_rgba(239,68,68,0.6)] disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
