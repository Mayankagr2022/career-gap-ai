import { useAuthStore } from '@/stores/auth.store';

export function useAccess() {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuthStore();

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.role === role;
  };

  const isAdmin = hasRole('ADMIN');
  const isUser = hasRole('USER') || isAdmin; // Allow admins to do user tasks as well

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    isAdmin,
    isUser,
    hasRole,
  };
}
