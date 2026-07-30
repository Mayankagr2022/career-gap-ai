'use client';

import { useAdminStats } from '@/hooks/use-admin';
import { formatDistanceToNow } from 'date-fns';
import { Activity, UserPlus, FileSearch } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-3xl font-bold font-display mb-6">Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-muted-foreground text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold mt-2">{stats?.totalUsers || 0}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-muted-foreground text-sm font-medium">Resumes Analyzed</h3>
          <p className="text-3xl font-bold mt-2">{stats?.totalResumes || 0}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-muted-foreground text-sm font-medium">Active Jobs</h3>
          <p className="text-3xl font-bold mt-2">{stats?.activeJobs || 0}</p>
        </div>
      </div>
      
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-brand-500" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        
        <div className="space-y-6">
          {stats?.activities.map((activity) => (
            <div key={activity.id} className="flex gap-4">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                activity.type === 'NEW_USER' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
              }`}>
                {activity.type === 'NEW_USER' ? <UserPlus className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{activity.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              </div>
            </div>
          ))}
          
          {(!stats?.activities || stats.activities.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
