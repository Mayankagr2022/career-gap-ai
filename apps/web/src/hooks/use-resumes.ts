import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface Resume {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  atsScore?: number;
  parsedData?: any;
  createdAt: string;
}

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get<Resume[]>('/resumes'),
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
      toast.error(error.response?.data?.message?.[0] || 'Upload failed');
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
  });
}

export function useResumeDownload(id: string) {
  return useQuery({
    queryKey: ['resume-download', id],
    queryFn: () => api.get<{ url: string; expiresIn: number }>(`/resumes/${id}/download`),
    enabled: false,
  });
}
