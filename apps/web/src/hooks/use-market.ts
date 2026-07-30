import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useMarketTrends(limit: number = 20) {
  return useQuery({
    queryKey: ['market-trends', limit],
    queryFn: () => api.get<any[]>(`/market/trending?limit=${limit}`),
  });
}

export function useSkillDemand(skills?: string[]) {
  return useQuery({
    queryKey: ['skill-demand', skills],
    queryFn: () => {
      const qs = skills?.length ? `?skills=${skills.join(',')}` : '';
      return api.get<any[]>(`/market/skills${qs}`);
    },
  });
}

export function useSkillSearch(query?: string) {
  return useQuery({
    queryKey: ['skill-search', query],
    queryFn: () => {
      return api.get<any[]>(`/market/search?q=${encodeURIComponent(query || '')}`);
    },
    enabled: !!query && query.trim().length > 0,
  });
}
