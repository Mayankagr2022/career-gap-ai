import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface DailyPoint {
  day: string;
  users: number;
  resumes: number;
  jobs: number;
  analyses: number;
}

export interface AiDailyPoint {
  day: string;
  calls: number;
  tokens: number;
  failed: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface AdminAnalytics {
  days: number;
  generatedAt: string;
  totals: {
    users: number;
    resumes: number;
    jobs: number;
    activeJobs: number;
    analyses: number;
    roadmaps: number;
    coachingSessions: number;
    skills: number;
  };
  period: { users: number; resumes: number; jobs: number; analyses: number };
  previous: { users: number; resumes: number; jobs: number; analyses: number };
  daily: DailyPoint[];
  aiDaily: AiDailyPoint[];
  distributions: {
    usersByRole: NamedValue[];
    usersByStatus: NamedValue[];
    usersByProvider: NamedValue[];
    analysesByStatus: NamedValue[];
    resumesByStatus: NamedValue[];
  };
  quality: {
    avgMatchScore: number | null;
    avgAtsScore: number | null;
    avgProcessingMs: number | null;
    analysisSuccessRate: number | null;
    scoreHistogram: { range: string; count: number }[];
  };
  ai: {
    calls: number;
    failed: number;
    successRate: number | null;
    avgLatencyMs: number | null;
    inputTokens: number;
    outputTokens: number;
    byFeature: { name: string; calls: number; tokens: number }[];
    byModel: { name: string; calls: number; tokens: number }[];
  };
  topGapSkills: NamedValue[];
  topUsers: { id: string; name: string; email: string; role: string; analyses: number; resumes: number }[];
  heatmap: { day: number; hour: number; count: number }[];
}

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => api.get<AdminAnalytics>(`/users/admin/analytics?days=${days}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  limit: number;
  skip: number;
  actions: NamedValue[];
}

export function useAdminAudit(params: { limit?: number; skip?: number; action?: string }) {
  const { limit = 25, skip = 0, action = '' } = params;
  const qs = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  if (action) qs.set('action', action);
  return useQuery({
    queryKey: ['admin-audit', limit, skip, action],
    queryFn: () => api.get<AuditPage>(`/users/admin/audit?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });
}
