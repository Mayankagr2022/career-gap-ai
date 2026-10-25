import { create } from 'zustand';
import { getApiUrl } from '@/lib/api-client';

/**
 * The session cookies are HttpOnly, so JavaScript cannot see whether a visitor has a session. This flag remembers the
 * last known state in the browser so the app can skip calling the API for visitors who are known to be signed out.
 *   '1' = signed in, '0' = signed out, missing = never seen: ask the server once.
 */
const SESSION_HINT_KEY = 'cg-session';

export const getSessionHint = (): '1' | '0' | null => {
  try {
    const value = typeof window === 'undefined' ? null : window.localStorage.getItem(SESSION_HINT_KEY);
    return value === '1' || value === '0' ? value : null;
  } catch {
    return null; // storage blocked: behave as if nothing is known
  }
};

export const setSessionHint = (signedIn: boolean) => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(SESSION_HINT_KEY, signedIn ? '1' : '0');
  } catch {
    /* storage blocked: the hint is only an optimisation */
  }
};

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: string;
  provider: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  previewAvatar: string | null;

  setAuth: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setPreviewAvatar: (url: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  previewAvatar: null,

  setAuth: (user) => {
    // Transform S3 avatar URLs to use the backend proxy endpoint
    if (user.avatar && user.avatar.includes('amazonaws.com')) {
      const apiUrl = getApiUrl();
      user.avatar = `${apiUrl}/users/${user.id}/avatar`;
    }
    setSessionHint(true);
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      // Transform S3 avatar URLs and add cache-buster so new image loads immediately
      if (updates.avatar && updates.avatar.includes('amazonaws.com')) {
        const apiUrl = getApiUrl();
        updates.avatar = `${apiUrl}/users/${currentUser.id}/avatar?t=${Date.now()}`;
      }
      set({ user: { ...currentUser, ...updates } });
    }
  },

  clearAuth: () => {
    setSessionHint(false);
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setPreviewAvatar: (url) => set({ previewAvatar: url }),
}));
