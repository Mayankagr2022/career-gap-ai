'use client';

import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from '@/hooks/use-admin';
import { useAuthStore } from '@/stores/auth.store';
import { format } from 'date-fns';
import { Shield, ShieldAlert, User as UserIcon, Ban, CheckCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const { data: users, isLoading, error } = useAdminUsers();
  const { user: currentUser } = useAuthStore();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateUserRole();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
        Failed to load users. Are you sure you are an admin?
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display">User Management</h1>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-foreground/5 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium">Stats</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map((user) => {
                const isMe = currentUser?.id === user.id;
                return (
                <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-500">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-500">
                        <Shield className="h-3.5 w-3.5" />
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>{user._count.resumes} Resumes</span>
                      <span>{user._count.analyses} Analyses</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => updateRole({ id: user.id, role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                        disabled={isMe || isUpdatingRole}
                        title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                          user.role === 'ADMIN' 
                            ? 'border-orange-500/20 text-orange-500 hover:bg-orange-500/10' 
                            : 'border-purple-500/20 text-purple-500 hover:bg-purple-500/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {user.role === 'ADMIN' ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                      </button>

                      <button
                        onClick={() => updateStatus({ id: user.id, isActive: !user.isActive })}
                        disabled={isMe || isUpdatingStatus}
                        title={user.isActive ? 'Suspend Account' : 'Activate Account'}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                          user.isActive 
                            ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' 
                            : 'border-green-500/20 text-green-500 hover:bg-green-500/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              
              {users?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
