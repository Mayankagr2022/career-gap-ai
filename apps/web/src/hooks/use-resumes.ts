import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

interface Resume {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  atsScore?: number;
  errorMessage?: string | null;
  parsedData?: any;
  createdAt: string;
}

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get<Resume[]>('/resumes'),
    // Keep polling while any resume is still being processed so the badge flips without a manual refresh
    // Give up after 10 minutes so a job that never finishes doesn't poll forever
    refetchInterval: (query) =>
      query.state.data?.some(
        (r) =>
          (r.status === 'PENDING' || r.status === 'PROCESSING') &&
          Date.now() - new Date(r.createdAt).getTime() < 10 * 60 * 1000,
      )
        ? 3000
        : false,
  });
}

export function useResume(id: string) {
  return useQuery({
    queryKey: ['resumes', id],
    queryFn: () => api.get<Resume>(`/resumes/${id}`),
    enabled: !!id,
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<Resume>('/resumes/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
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
    mutationFn: (id: string) => api.delete(`/resumes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete resume'));
    },
  });
}

export function useResumeDownload(id: string) {
  return useQuery({
    queryKey: ['resume-download', id],
    queryFn: () => api.get<{ url: string; expiresIn: number }>(`/resumes/${id}/download`),
    enabled: false,
  });
}
