import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface CreateJobData {
  title: string;
  company: string;
  description: string;
  location?: string;
  remote?: boolean;
  salary?: { min: number; max: number; currency?: string };
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get<any[]>('/jobs'),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api.get<any>(`/jobs/${id}`),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobData) => api.post<any>('/jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job added and AI is parsing requirements...');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message?.[0] || 'Failed to create job');
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job removed');
    },
  });
}
