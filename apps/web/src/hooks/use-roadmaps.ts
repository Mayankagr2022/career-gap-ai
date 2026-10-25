import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

export function useRoadmaps() {
  return useQuery({
    queryKey: ['roadmaps'],
    queryFn: () => api.get<any[]>('/roadmaps'),
  });
}

export function useRoadmap(id: string) {
  return useQuery({
    queryKey: ['roadmaps', id],
    queryFn: () => api.get<any>(`/roadmaps/${id}`),
    enabled: !!id,
  });
}

export function useUpdateRoadmapTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roadmapId,
      milestoneId,
      taskId,
      completed,
    }: {
      roadmapId: string;
      milestoneId: string;
      taskId: string;
      completed: boolean;
    }) => api.patch(`/roadmaps/${roadmapId}/task`, { milestoneId, taskId, completed }),
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update task'));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps', variables.roadmapId] });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
    },
  });
}

export function useDeleteRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/roadmaps/${id}`),
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete roadmap'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      toast.success('Roadmap deleted');
    },
  });
}
