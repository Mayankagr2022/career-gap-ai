import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export const notificationKeys = {
  all: ['notifications'] as const,
};

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

const POLL_MS = 20_000;

/** Pop-up for a notification that arrived while the user is looking at the app. */
function showToast(n: Notification) {
  const options = { description: n.message, id: n.id };
  if (n.type === 'SUCCESS') toast.success(n.title, options);
  else if (n.type === 'ERROR') toast.error(n.title, options);
  else if (n.type === 'WARNING') toast.warning(n.title, options);
  else toast.info(n.title, options);
}

/**
 * The bell's data. Notifications are created by background jobs on the server, so the app also refreshes
 * this list as soon as it sees a resume or analysis finish (see use-resumes / use-analyses), not only on the timer.
 * Call this from one place (the header bell): it also raises the pop-ups.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.all,
    queryFn: notificationsApi.list,
    refetchInterval: POLL_MS,
    // Opening the tab again is exactly when the user wants to know what finished meanwhile
    refetchOnWindowFocus: true,
  });

  // Toast anything new and unread. The first load only records what already exists so old items don't pop up.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const items = query.data;
    if (!Array.isArray(items)) return;
    if (seen.current === null) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    for (const n of items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.isRead) showToast(n);
    }
  }, [query.data]);

  const markAsRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<Notification[]>(notificationKeys.all);
      queryClient.setQueryData<Notification[]>(notificationKeys.all, (old) =>
        old?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return { previous };
    },
    onError: (error: any, _id, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.all, context.previous);
      toast.error(getErrorMessage(error, 'Failed to mark notification as read'));
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<Notification[]>(notificationKeys.all);
      queryClient.setQueryData<Notification[]>(notificationKeys.all, (old) => old?.map((n) => ({ ...n, isRead: true })));
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.all, context.previous);
      toast.error(getErrorMessage(error, 'Failed to mark notifications as read'));
    },
  });

  return {
    ...query,
    markAsRead,
    markAllAsRead,
  };
}
