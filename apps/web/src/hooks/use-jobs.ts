import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
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
      toast.error(getErrorMessage(error, 'Failed to create job'));
    },
  });
}

export interface JobUploadDraft {
  draftId: string;
  filename: string;
  /** Rule-based guesses from the file text; null when nothing could be detected. */
  title: string | null;
  company: string | null;
  description: string;
  expiresInSeconds: number;
}

/** Step 1: extract the file's text (no AI) and get a draft to review. Nothing is saved yet. */
export function useUploadJobFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<JobUploadDraft>('/jobs/upload', formData);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Upload failed'));
    },
  });
}

/** Step 2: save the draft with the confirmed title and company; the AI parse runs here. */
export function useConfirmJobUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, title, company }: { draftId: string; title: string; company: string }) =>
      api.post<any>(`/jobs/upload/${draftId}/confirm`, { title, company }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job added');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to save job'));
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`),
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete job'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job removed');
    },
  });
}
