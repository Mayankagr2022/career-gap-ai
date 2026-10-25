import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

export const recommendationKeys = {
  all: ['recommendations'] as const,
  lists: () => [...recommendationKeys.all, 'list'] as const,
  list: (analysisId?: string) => [...recommendationKeys.lists(), analysisId ?? 'all'] as const,
  stats: () => [...recommendationKeys.all, 'stats'] as const,
};

/** Thin wrapper over the recommendations endpoints. */
export const recommendationsApi = {
  list: (analysisId?: string) =>
    api.get<any[]>(analysisId ? `/recommendations?analysisId=${analysisId}` : '/recommendations'),
  stats: () => api.get<any>('/recommendations/stats'),
  complete: (id: string) => api.patch(`/recommendations/${id}/complete`),
  incomplete: (id: string) => api.patch(`/recommendations/${id}/incomplete`),
};

export function useRecommendations(analysisId?: string) {
  return useQuery({
    queryKey: recommendationKeys.list(analysisId),
    queryFn: () => recommendationsApi.list(analysisId),
  });
}

export function useRecommendationStats() {
  return useQuery({
    queryKey: recommendationKeys.stats(),
    queryFn: recommendationsApi.stats,
  });
}

/** Flip isCompleted in every cached list right away; returns the snapshots needed to roll back. */
function setCompletedInCache(queryClient: QueryClient, id: string, isCompleted: boolean) {
  const snapshots = queryClient.getQueriesData<any[]>({ queryKey: recommendationKeys.lists() });
  queryClient.setQueriesData<any[]>({ queryKey: recommendationKeys.lists() }, (old) =>
    old?.map((r) => (r.id === id ? { ...r, isCompleted } : r)),
  );
  return snapshots;
}

function useToggleRecommendation(
  mutationFn: (id: string) => Promise<unknown>,
  isCompleted: boolean,
  onDone?: () => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: recommendationKeys.lists() });
      return { snapshots: setCompletedInCache(queryClient, id, isCompleted) };
    },
    onError: (error: any, _id, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(getErrorMessage(error, 'Failed to update recommendation'));
    },
    onSuccess: () => {
      // The lists are already correct; only the small aggregate needs a refresh
      queryClient.invalidateQueries({ queryKey: recommendationKeys.stats() });
      onDone?.();
    },
  });
}

export function useMarkRecommendationComplete() {
  return useToggleRecommendation(recommendationsApi.complete, true, () =>
    toast.success('Recommendation marked as completed!'),
  );
}

export function useMarkRecommendationIncomplete() {
  return useToggleRecommendation(recommendationsApi.incomplete, false);
}
