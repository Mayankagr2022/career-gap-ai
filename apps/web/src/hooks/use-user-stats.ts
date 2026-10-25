import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const userStatsKey = ['user-stats'] as const;

/** Dashboard counters and latest-analysis summary. One cache entry shared by every card that shows it. */
export function useUserStats() {
  return useQuery({
    queryKey: userStatsKey,
    queryFn: () => api.get<any>('/users/stats'),
  });
}
