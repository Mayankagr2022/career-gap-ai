'use client';

import { RequireRole } from '@/components/auth/require-role';
import { AdminHeader } from './_components/admin-header';

/**
 * The admin console is a separate product surface: `.admin-theme` (globals.css) swaps in the emerald/amber palette and
 * paints an opaque dotted background over the user portal's aurora, and navigation is a top bar instead of a sidebar.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="ADMIN">
      <div className="admin-theme flex h-[100dvh] flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] p-4 pb-12 sm:p-6">{children}</div>
        </main>
      </div>
    </RequireRole>
  );
}
