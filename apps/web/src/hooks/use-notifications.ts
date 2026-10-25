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

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    refetchInterval: 30000, // Poll every 30s
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to mark notification as read'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to mark notifications as read'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    ...query,
    markAsRead,
    markAllAsRead,
  };
}
