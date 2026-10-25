import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

export const roadmapKeys = {
  all: ['roadmaps'] as const,
  list: () => [...roadmapKeys.all, 'list'] as const,
  detail: (id: string) => [...roadmapKeys.all, 'detail', id] as const,
};

export interface UpdateRoadmapTaskVars {
  roadmapId: string;
  milestoneId: string;
  taskId: string;
  completed: boolean;
}

interface UpdateRoadmapTaskResult {
  roadmapId: string;
  milestoneId: string;
  taskId: string;
  completed: boolean;
  milestoneCompleted: boolean;
  completionPct: number;
}

/** Thin wrapper over the roadmaps endpoints. */
export const roadmapsApi = {
  list: () => api.get<any[]>('/roadmaps'),
  detail: (id: string) => api.get<any>(`/roadmaps/${id}`),
  updateTask: ({ roadmapId, milestoneId, taskId, completed }: UpdateRoadmapTaskVars) =>
    api.patch<UpdateRoadmapTaskResult>(`/roadmaps/${roadmapId}/task`, { milestoneId, taskId, completed }),
  remove: (id: string) => api.delete(`/roadmaps/${id}`),
};

export function useRoadmaps() {
  return useQuery({
    queryKey: roadmapKeys.list(),
    queryFn: roadmapsApi.list,
  });
}

export function useRoadmap(id: string) {
  return useQuery({
    queryKey: roadmapKeys.detail(id),
    queryFn: () => roadmapsApi.detail(id),
    enabled: !!id,
  });
}

/** Applies one task toggle to a cached roadmap, recomputing the milestone flag and overall percentage. */
function applyTaskToggle(roadmap: any, { milestoneId, taskId, completed }: UpdateRoadmapTaskVars) {
  const milestones = roadmap.milestones.map((m: any) => {
    if (m.id !== milestoneId) return m;
    const tasks = m.tasks.map((t: any) => (t.id === taskId ? { ...t, completed } : t));
    return { ...m, tasks, completed: tasks.length > 0 && tasks.every((t: any) => t.completed) };
  });
  const all = milestones.flatMap((m: any) => m.tasks);
  const done = all.filter((t: any) => t.completed).length;
  return { ...roadmap, milestones, completionPct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

/**
 * Toggling a task updates the cached roadmap immediately and the server reply only confirms it,
 * so a checkbox click no longer re-downloads every roadmap.
 */
export function useUpdateRoadmapTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roadmapsApi.updateTask,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: roadmapKeys.list() });
      const previous = queryClient.getQueryData<any[]>(roadmapKeys.list());
      queryClient.setQueryData<any[]>(roadmapKeys.list(), (old) =>
        old?.map((r) => (r.id === vars.roadmapId ? applyTaskToggle(r, vars) : r)),
      );
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(roadmapKeys.list(), context.previous);
      toast.error(getErrorMessage(error, 'Failed to update task'));
    },
    onSuccess: (result, vars) => {
      // Take the server's percentage as the source of truth
      queryClient.setQueryData<any[]>(roadmapKeys.list(), (old) =>
        old?.map((r) => (r.id === vars.roadmapId ? { ...r, completionPct: result.completionPct } : r)),
      );
      // A cached detail page is out of date now; refetch it only if it is actually on screen
      queryClient.invalidateQueries({ queryKey: roadmapKeys.detail(vars.roadmapId), refetchType: 'none' });
    },
  });
}

export function useDeleteRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roadmapsApi.remove,
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to delete roadmap'));
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<any[]>(roadmapKeys.list(), (old) => old?.filter((r) => r.id !== id));
      queryClient.removeQueries({ queryKey: roadmapKeys.detail(id) });
      toast.success('Roadmap deleted');
    },
  });
}
