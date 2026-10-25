import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    resumes: number;
    analyses: number;
  };
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/users/all'),
  });
}

export interface AdminStats {
  totalUsers: number;
  totalResumes: number;
  activeJobs: number;
  activities: {
    id: string;
    type: 'NEW_USER' | 'NEW_ANALYSIS';
    title: string;
    description: string;
    date: string;
  }[];
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/users/admin/stats'),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ADMIN' | 'USER' }) =>
      api.put(`/users/admin/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update user role'));
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/users/admin/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated successfully');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update user status'));
    },
  });
}
