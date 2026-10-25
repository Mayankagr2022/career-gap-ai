'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api-client';

/**
 * Keeps every open tab in step with the session. The browser's `storage` event fires in the OTHER tabs when one tab
 * changes the saved session flag, so:
 *  - signing out in one tab signs the rest out (their guards then send them to the sign-in page);
 *  - signing in in one tab makes the others load the user, so a sign-in page left open redirects to the dashboard.
 */
export function AuthSync() {
  useEffect(() => {
    const onStorage = async (e: StorageEvent) => {
      if (e.key !== 'cg-session') return;
      const store = useAuthStore.getState();

      if (e.newValue === '0' && store.isAuthenticated) {
        store.clearAuth();
      } else if (e.newValue === '1' && !store.isAuthenticated) {
        try {
          const user = await api.get<any>('/auth/user');
          useAuthStore.getState().setAuth(user);
        } catch {
          /* the other tab's session is not usable here; stay signed out */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
