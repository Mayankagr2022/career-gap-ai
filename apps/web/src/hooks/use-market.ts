import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface MarketOverview {
  activeJobs: number;
  minJobs: number;
  /** Enough jobs exist for any stats to be published */
  ready: boolean;
  /** A week-old snapshot exists, so rising/declining can be measured */
  trendHistory: boolean;
  skillCount: number;
  lastUpdated: string | null;
}

export const marketKeys = {
  all: ['market'] as const,
  overview: () => [...marketKeys.all, 'overview'] as const,
  trending: (limit: number) => [...marketKeys.all, 'trending', limit] as const,
  demand: (skills?: string[]) => [...marketKeys.all, 'demand', skills ?? []] as const,
  search: (query?: string) => [...marketKeys.all, 'search', query ?? ''] as const,
};

/** Thin wrapper over the market endpoints. */
export const marketApi = {
  overview: () => api.get<MarketOverview>('/market/overview'),
  trending: (limit: number) => api.get<any[]>(`/market/trending?limit=${limit}`),
  demand: (skills?: string[]) => api.get<any[]>(`/market/skills${skills?.length ? `?skills=${skills.join(',')}` : ''}`),
  search: (query: string) => api.get<any[]>(`/market/search?q=${encodeURIComponent(query)}`),
};

// Market stats are recomputed on the server every few minutes, so there is no point refetching sooner
const MARKET_STALE_MS = 5 * 60 * 1000;

/** Rising skills first, topped up with the most in-demand ones until history exists. */
export function useMarketTrends(limit: number = 20) {
  return useQuery({
    queryKey: marketKeys.trending(limit),
    queryFn: () => marketApi.trending(limit),
    staleTime: MARKET_STALE_MS,
  });
}

/** How many jobs the stats rest on and whether trends can be measured yet; explains an empty or partial screen. */
export function useMarketOverview() {
  return useQuery({
    queryKey: marketKeys.overview(),
    queryFn: marketApi.overview,
    staleTime: MARKET_STALE_MS,
  });
}

export function useSkillDemand(skills?: string[]) {
  return useQuery({
    queryKey: marketKeys.demand(skills),
    queryFn: () => marketApi.demand(skills),
    staleTime: MARKET_STALE_MS,
  });
}

export function useSkillSearch(query?: string) {
  return useQuery({
    queryKey: marketKeys.search(query),
    queryFn: () => marketApi.search(query || ''),
    enabled: !!query && query.trim().length > 0,
    staleTime: MARKET_STALE_MS,
  });
}
