import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const coachingKeys = {
  all: ['coaching'] as const,
  sessions: () => [...coachingKeys.all, 'sessions'] as const,
  session: (id: string) => [...coachingKeys.all, 'session', id] as const,
};

/** Thin wrapper over the coaching endpoints. */
export const coachingApi = {
  sessions: () => api.get<any[]>('/coaching/sessions'),
  session: (id: string) => api.get<any>(`/coaching/sessions/${id}`),
  start: (message: string) => api.post<{ sessionId: string; response: string }>('/coaching/sessions', { message }),
  send: (sessionId: string, message: string) =>
    api.post<{ response: string }>(`/coaching/sessions/${sessionId}/messages`, { message }),
  remove: (sessionId: string) => api.delete(`/coaching/sessions/${sessionId}`),
};

export function useCoachingSessions() {
  return useQuery({
    queryKey: coachingKeys.sessions(),
    queryFn: coachingApi.sessions,
  });
}

/** Transcript of one session. Only fetched when `enabled`, e.g. when the user opens an old chat. */
export function useCoachingSession(id: string | null, enabled = true) {
  return useQuery({
    queryKey: coachingKeys.session(id ?? ''),
    queryFn: () => coachingApi.session(id as string),
    enabled: !!id && enabled,
  });
}

interface StartCallbacks {
  onMutate?: (message: string) => void;
  onSuccess?: (data: { sessionId: string; response: string }) => void;
  onError?: (error: any, message: string) => void;
}

export function useStartCoachingSession(callbacks: StartCallbacks = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coachingApi.start,
    onMutate: (message) => callbacks.onMutate?.(message),
    onSuccess: (data) => {
      // A new row for the sidebar; its transcript is already on screen so there is nothing to fetch for it
      queryClient.invalidateQueries({ queryKey: coachingKeys.sessions() });
      callbacks.onSuccess?.(data);
    },
    onError: (error, message) => callbacks.onError?.(error, message),
  });
}

interface ContinueCallbacks {
  onMutate?: (message: string) => void;
  onSuccess?: (data: { response: string }) => void;
  onError?: (error: any, message: string) => void;
}

export function useContinueCoachingSession(sessionId: string | null, callbacks: ContinueCallbacks = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => coachingApi.send(sessionId as string, message),
    onMutate: (message) => callbacks.onMutate?.(message),
    onSuccess: (data) => {
      if (sessionId) {
        // The cached transcript is now missing this turn; drop it so reopening the chat refetches
        queryClient.removeQueries({ queryKey: coachingKeys.session(sessionId) });
        // Move the chat to the top of the sidebar locally instead of refetching the list
        queryClient.setQueryData<any[]>(coachingKeys.sessions(), (old) => {
          const current = old?.find((s) => s.id === sessionId);
          if (!old || !current) return old;
          return [{ ...current, updatedAt: new Date().toISOString() }, ...old.filter((s) => s.id !== sessionId)];
        });
      }
      callbacks.onSuccess?.(data);
    },
    onError: (error, message) => callbacks.onError?.(error, message),
  });
}

export function useDeleteCoachingSession(onDeleted?: (sessionId: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coachingApi.remove,
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<any[]>(coachingKeys.sessions(), (old) => old?.filter((s) => s.id !== sessionId));
      queryClient.removeQueries({ queryKey: coachingKeys.session(sessionId) });
      onDeleted?.(sessionId);
    },
  });
}
