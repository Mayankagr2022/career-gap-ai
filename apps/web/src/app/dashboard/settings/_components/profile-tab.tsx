'use client';

import { useRef, ChangeEvent, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Loader2, Save, Mail, BadgeCheck, Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api-client';
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
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
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
    <div className="glass-card p-6">
      <div className="relative mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative rounded-full p-1 bg-background shrink-0 mx-auto sm:mx-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/png, image/jpeg, image/webp" 
            />
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-3xl font-bold text-white shadow-xl overflow-hidden group relative">
              {previewAvatar || user?.avatar ? (
                <Image src={previewAvatar || user!.avatar!} alt={user?.name || 'Avatar'} fill sizes="96px" className="object-cover" priority unoptimized />
              ) : (
                user?.name.charAt(0)
              )}
              <div 
                onClick={handleAvatarClick}
                className={`absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center" title={`Verified by ${user?.provider}`}>
                <BadgeCheck className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            
            <div className="mb-2 sm:mb-0">
              <h2 className="font-display text-3xl font-bold leading-normal py-1">{user?.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-4 w-4" />
                {user?.email}
              </p>
            </div>
          </div>
          
          <div className="mb-2 flex justify-center sm:justify-end">
            <span className="inline-flex items-center rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
              {user?.provider === 'LOCAL' ? 'Local Account' : `Managed by ${user?.provider}`}
            </span>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6">
          <h3 className="font-display text-lg font-semibold mb-4">Edit Profile</h3>
          <form onSubmit={handleSubmit((data) => updateProfile(data))} className="space-y-5 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input {...register('name')} className="input-field pl-10" />
              </div>
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message as string}</p>}
            </div>
            
            <button type="submit" disabled={isUpdatingProfile} className="btn-primary mt-2">
              {isUpdatingProfile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
            </button>
          </form>
        </div>
    </div>
  );
}
