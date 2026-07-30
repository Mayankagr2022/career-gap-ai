import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export function useRecommendations(analysisId?: string) {
  return useQuery({
    queryKey: ['recommendations', analysisId],
    queryFn: () => {
      const url = analysisId ? `/recommendations?analysisId=${analysisId}` : '/recommendations';
      return api.get<any[]>(url);
    },
  });
}

export function useRecommendationStats() {
  return useQuery({
    queryKey: ['recommendation-stats'],
    queryFn: () => api.get<any>('/recommendations/stats'),
  });
}

export function useMarkRecommendationComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch(`/recommendations/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation-stats'] });
      toast.success('Recommendation marked as completed!');
    },
  });
}

export function useMarkRecommendationIncomplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch(`/recommendations/${id}/incomplete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendation-stats'] });
    },
  });
}
