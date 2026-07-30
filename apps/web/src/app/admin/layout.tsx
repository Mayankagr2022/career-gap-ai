'use client';

import { RequireRole } from '@/components/auth/require-role';
import Link from 'next/link';
import { LayoutDashboard, Users, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth';

import { AdminHeader } from './_components/admin-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { mutate: logout } = useLogout();

  return (
    <RequireRole role="ADMIN">
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Admin Sidebar */}
        <aside className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-6">
            <h1 className="font-display text-xl font-bold gradient-text">Admin Portal</h1>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <Link href="/admin" className="nav-link">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>
            <Link href="/admin/users" className="nav-link">
              <Users className="h-5 w-5" />
              Users
            </Link>
            <Link href="/admin/settings" className="nav-link">
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </nav>
          <div className="p-4 border-t border-border space-y-2">
            <Link href="/dashboard" className="nav-link w-full text-left">
              <ArrowLeft className="h-5 w-5" />
              Back to User App
            </Link>
            <button onClick={() => logout()} className="nav-link w-full text-left text-red-500 hover:text-red-600 hover:bg-red-500/10">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-8 bg-muted/20">
            {children}
          </main>
        </div>
      </div>
    </RequireRole>
  );
}
