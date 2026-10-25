'use client';

import { useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { User, Loader2, Save, Mail, BadgeCheck, Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
});

export function ProfileTab() {
  const { user, updateUser, previewAvatar, setPreviewAvatar } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema as any),
    defaultValues: { name: user?.name || '' }
  });

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useMutation({
    mutationFn: (data: { name: string }) => api.put<{ name: string }>('/users/profile', data),
    onSuccess: (data: any) => {
      updateUser({ name: data?.name });
      toast.success('Profile updated successfully');
    },
    onError: () => toast.error('Failed to update profile')
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useMutation({
    mutationFn: (formData: FormData) => api.upload<{ avatar: string }>('/users/avatar', formData),
    onSuccess: (data: any) => {
      updateUser({ avatar: data?.avatar });
      setPreviewAvatar(null);
      toast.success('Profile picture updated successfully');
    },
    onError: (error: any) => {
      setPreviewAvatar(null);
      toast.error(getErrorMessage(error, 'Failed to upload profile picture'));
    }
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewAvatar(objectUrl);

    const formData = new FormData();
    formData.append('file', file);
    uploadAvatar(formData);
  };

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card relative overflow-hidden p-5 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left">
          <div className="relative shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
            />
            {/* glowing gradient ring */}
            <div className="rounded-full bg-gradient-to-tr from-brand-500 via-violet-500 to-cyan-400 p-[3px] shadow-glow-lg">
              <div className="rounded-full bg-background p-1">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  aria-label="Change profile picture"
                  className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-3xl font-bold text-white sm:h-28 sm:w-28"
                >
                  {previewAvatar || user?.avatar ? (
                    <Image src={previewAvatar || user!.avatar!} alt={user?.name || 'Avatar'} fill sizes="112px" className="object-cover" priority unoptimized />
                  ) : (
                    user?.name.charAt(0)
                  )}
                  <span
                    className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </span>
                </button>
              </div>
            </div>
            <div
              className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-lg"
              title={`Verified by ${user?.provider}`}
            >
              <BadgeCheck className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-2xl font-bold sm:text-3xl">{user?.name}</h2>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="eyebrow !normal-case !tracking-normal">
                {user?.provider === 'LOCAL' ? 'Local Account' : `Managed by ${user?.provider}`}
              </span>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/10 disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5" />
                Change photo
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="glass-card p-5 sm:p-8"
      >
        <h3 className="mb-5 font-display text-lg font-semibold">Edit Profile</h3>
        <form onSubmit={handleSubmit((data) => updateProfile(data))} className="max-w-md space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input {...register('name')} className="input-field pl-10" />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message as string}</p>}
          </div>

          <button type="submit" disabled={isUpdatingProfile} className="btn-primary mt-2 min-h-[44px] w-full sm:w-auto">
            {isUpdatingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
