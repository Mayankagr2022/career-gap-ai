import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';
import { analysisKeys } from './use-analyses';
import { userStatsKey } from './use-user-stats';
import { notificationKeys } from './use-notifications';

/** List row: card fields plus a short skills preview (the full parsed resume comes from useResume). */
export interface ResumeSummary {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  atsScore?: number | null;
  errorMessage?: string | null;
  skills: string[];
  skillCount: number;
  createdAt: string;
}

export interface Resume extends Omit<ResumeSummary, 'skills' | 'skillCount'> {
  parsedData?: any;
  analyses?: any[];
}

export const resumeKeys = {
  all: ['resumes'] as const,
  list: () => [...resumeKeys.all, 'list'] as const,
  detail: (id: string) => [...resumeKeys.all, 'detail', id] as const,
  download: (id: string) => [...resumeKeys.all, 'download', id] as const,
};

/** Thin wrapper over the resumes endpoints. */
export const resumesApi = {
  list: () => api.get<ResumeSummary[]>('/resumes'),
  detail: (id: string) => api.get<Resume>(`/resumes/${id}`),
  download: (id: string) => api.get<{ url: string; expiresIn: number }>(`/resumes/${id}/download`),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<ResumeSummary>('/resumes/upload', formData);
  },
  remove: (id: string) => api.delete(`/resumes/${id}`),
};

const MAX_POLL_AGE_MS = 10 * 60 * 1000;

/** Poll every 3s at first, then back off to 10s. */
const pollInterval = (query: Query<any, any, any, any>) =>
  Math.min(3000 + query.state.dataUpdateCount * 1000, 10000);

export function useResumes() {
  const queryClient = useQueryClient();
  const inFlight = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: resumeKeys.list(),
    queryFn: resumesApi.list,
    // Keep polling while any resume is still being processed so the badge flips without a manual refresh.
    // Give up after 10 minutes so a job that never finishes doesn't poll forever.
    refetchInterval: (query) =>
      query.state.data?.some(
        (r) =>
          (r.status === 'PENDING' || r.status === 'PROCESSING') &&
          Date.now() - new Date(r.createdAt).getTime() < MAX_POLL_AGE_MS,
      )
        ? pollInterval(query)
        : false,
  });

  // A resume that was processing and no longer is just finished (or failed): the server has created a
  // notification for it, so pick it up now instead of waiting for the next timer tick.
  useEffect(() => {
    if (!query.data) return;
    const now = new Set(query.data.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING').map((r) => r.id));
    const finished = [...inFlight.current].some((id) => !now.has(id));
    inFlight.current = now;
    if (finished) queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }, [query.data, queryClient]);

  return query;
}

/** Full resume (parsed data, recent analyses). Fetched on demand, e.g. when a detail modal opens. */
export function useResume(id: string) {
  return useQuery({
    queryKey: resumeKeys.detail(id),
    queryFn: () => resumesApi.detail(id),
    enabled: !!id,
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumesApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
      queryClient.invalidateQueries({ queryKey: userStatsKey });
      toast.success('Resume uploaded! AI is analyzing it now...');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Upload failed'));
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumesApi.remove,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.list() });
      queryClient.invalidateQueries({ queryKey: userStatsKey });
      queryClient.removeQueries({ queryKey: resumeKeys.detail(id) });
      // Deleting a resume cascades to its analyses
      queryClient.invalidateQueries({ queryKey: analysisKeys.all });
      toast.success('Resume deleted');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete resume'));
    },
  });
}

export function useResumeDownload(id: string) {
  return useQuery({
    queryKey: resumeKeys.download(id),
    queryFn: () => resumesApi.download(id),
    enabled: false,
  });
}
