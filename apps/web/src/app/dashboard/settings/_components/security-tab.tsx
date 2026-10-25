'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
      window.location.href = '/';
    }
  });

  return (
    <div className="space-y-6">
      {user?.provider === 'LOCAL' ? (
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold mb-6">Change Password</h2>
          <form onSubmit={handleSubmit((data) => updatePassword(data))} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Password</label>
              <input {...register('currentPassword')} type="password" className="input-field" />
              {errors.currentPassword && <p className="text-xs text-red-400 mt-1">{errors.currentPassword.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <input {...register('newPassword')} type="password" className="input-field" />
              {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
              <input {...register('confirmPassword')} type="password" className="input-field" />
              {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message as string}</p>}
            </div>
            <button type="submit" disabled={isUpdatingPassword} className="btn-primary mt-2">
              {isUpdatingPassword ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/> Updating...</> : 'Update Password'}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold mb-2">Password</h2>
          <p className="text-sm text-muted-foreground">
            You are logged in using {user?.provider}. Passwords are managed by your provider.
          </p>
        </div>
      )}

      <div className="glass-card p-6 border-red-500/20">
        <h2 className="font-display text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data, including resumes, analyses, and roadmaps.
        </p>
        <button 
          onClick={() => {
            if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
              deleteAccount();
            }
          }}
          disabled={isDeleting}
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}
