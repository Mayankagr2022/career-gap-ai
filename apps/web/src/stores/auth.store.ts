import { create } from 'zustand';
import { getApiUrl } from '@/lib/api-client';

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
