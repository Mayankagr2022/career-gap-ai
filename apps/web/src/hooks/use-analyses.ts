import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';
import { userStatsKey } from './use-user-stats';
import { roadmapKeys } from './use-roadmaps';
import { notificationKeys } from './use-notifications';
import { recommendationKeys } from './use-recommendations';
import { useRouter } from 'next/navigation';

/** Single source of truth for analysis query keys, so invalidations stay as narrow as possible. */
export const analysisKeys = {
  all: ['analyses'] as const,
  list: () => [...analysisKeys.all, 'list'] as const,
  detail: (id: string) => [...analysisKeys.all, 'detail', id] as const,
  status: (id: string) => [...analysisKeys.all, 'status', id] as const,
  latest: () => [...analysisKeys.all, 'latest'] as const,
};

/** Thin wrapper over the analyses endpoints; components and hooks never build these URLs themselves. */
export const analysesApi = {
  list: () => api.get<any[]>('/analyses'),
  detail: (id: string) => api.get<any>(`/analyses/${id}`),
  status: (id: string) => api.get<AnalysisStatusPayload>(`/analyses/${id}/status`),
  latest: () => api.get<any>('/analyses/latest'),
  create: (body: { resumeId: string; jobId: string }) => api.post<any>('/analyses', body),
  remove: (id: string) => api.delete(`/analyses/${id}`),
};

export interface AnalysisStatusPayload {
  id: string;
  status: string;
  errorMessage?: string | null;
  updatedAt: string;
}

export const isInFlight = (status?: string) => status === 'PENDING' || status === 'PROCESSING';

/** Poll every 3s at first, then back off to 10s so a slow analysis doesn't hammer the API. */
const pollInterval = (query: Query<any, any, any, any>) =>
  Math.min(3000 + query.state.dataUpdateCount * 1000, 10000);

export function useAnalyses() {
  return useQuery({
    queryKey: analysisKeys.list(),
    queryFn: analysesApi.list,
    // Keep the list fresh only while something is still running
    refetchInterval: (query) => (query.state.data?.some((a) => isInFlight(a.status)) ? pollInterval(query) : false),
  });
}

/**
 * Same cache entry (and same network request) as useAnalyses, trimmed to the newest few.
 * Use this instead of a separate useQuery so the dashboard and the list page share one fetch.
 */
export function useRecentAnalyses(count = 3) {
  return useQuery({
    queryKey: analysisKeys.list(),
    queryFn: analysesApi.list,
    select: (data) => data.slice(0, count),
  });
}

/**
 * Full analysis. While it is still running we poll the tiny /status endpoint instead of re-downloading
 * the whole result, and refetch the full record once, when the status changes.
 */
export function useAnalysis(id: string) {
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: analysisKeys.detail(id),
    queryFn: () => analysesApi.detail(id),
    enabled: !!id,
  });

  const detailStatus = detail.data?.status as string | undefined;
  const statusQuery = useQuery({
    queryKey: analysisKeys.status(id),
    queryFn: () => analysesApi.status(id),
    enabled: !!id && isInFlight(detailStatus),
    refetchInterval: pollInterval,
    // Never reuse an old status payload when a new run starts
    gcTime: 0,
  });

  const liveStatus = statusQuery.data?.status;
  useEffect(() => {
    if (liveStatus && detailStatus && liveStatus !== detailStatus) {
      queryClient.invalidateQueries({ queryKey: analysisKeys.detail(id) });
      if (!isInFlight(liveStatus)) {
        // The run finished: it may have produced a roadmap and recommendations, and it changes the dashboard
        queryClient.invalidateQueries({ queryKey: analysisKeys.list() });
        queryClient.invalidateQueries({ queryKey: analysisKeys.latest() });
        queryClient.invalidateQueries({ queryKey: userStatsKey });
        queryClient.invalidateQueries({ queryKey: roadmapKeys.list() });
        queryClient.invalidateQueries({ queryKey: recommendationKeys.all });
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
    }
  }, [liveStatus, detailStatus, id, queryClient]);

  return detail;
}

export function useLatestAnalysis() {
  return useQuery({
    queryKey: analysisKeys.latest(),
    queryFn: analysesApi.latest,
  });
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: analysesApi.create,
    onSuccess: (data) => {
      // Only the list and the dashboard summary change; existing detail pages stay cached
      queryClient.invalidateQueries({ queryKey: analysisKeys.list() });
      queryClient.invalidateQueries({ queryKey: analysisKeys.latest() });
      queryClient.invalidateQueries({ queryKey: userStatsKey });
      toast.success('Analysis started! AI is working on it...');
      router.push(`/dashboard/analyses/view?id=${data.id}`);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Analysis failed to start'));
    },
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: analysesApi.remove,
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete analysis'));
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.list() });
      queryClient.invalidateQueries({ queryKey: analysisKeys.latest() });
      queryClient.invalidateQueries({ queryKey: userStatsKey });
      queryClient.removeQueries({ queryKey: analysisKeys.detail(id) });
      queryClient.removeQueries({ queryKey: analysisKeys.status(id) });
      toast.success('Analysis deleted');
    },
  });
}
