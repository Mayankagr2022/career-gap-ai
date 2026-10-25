import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function useAnalyses() {
  return useQuery({
    queryKey: ['analyses'],
    queryFn: () => api.get<any[]>('/analyses'),
    // Keep the list fresh while any analysis is still running
    refetchInterval: (query) =>
      query.state.data?.some((a) => a.status === 'PENDING' || a.status === 'PROCESSING') ? 3000 : false,
  });
}

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ['analyses', id],
    queryFn: () => api.get<any>(`/analyses/${id}`),
    enabled: !!id,
    // Poll if still processing
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'PROCESSING' ? 3000 : false;
    },
  });
}

export function useLatestAnalysis() {
  return useQuery({
    queryKey: ['analyses', 'latest'],
    queryFn: () => api.get<any>('/analyses/latest'),
  });
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ resumeId, jobId }: { resumeId: string; jobId: string }) =>
      api.post<any>('/analyses', { resumeId, jobId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.success('Analysis started! AI is working on it...');
      router.push(`/dashboard/analyses/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Analysis failed to start'));
    },
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/analyses/${id}`),
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete analysis'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.success('Analysis deleted');
    },
  });
}
