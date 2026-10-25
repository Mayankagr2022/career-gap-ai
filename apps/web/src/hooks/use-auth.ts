import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiClient, getErrorMessage } from '@/lib/api-client';
import { useAuthStore, setSessionHint } from '@/stores/auth.store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RegisterData { name: string; email: string; password: string; }
interface LoginData { email: string; password: string; }

interface AuthResponse {
  user: { id: string; email: string; name: string; avatar?: string | null; role: string; provider: string; };
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterData) =>
      apiClient.post<{ data: AuthResponse }>('/auth/register', data).then((r) => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user);
      toast.success('Welcome to CareerGap AI!');
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Registration failed'));
    },
  });
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginData) =>
      apiClient.post<{ data: AuthResponse }>('/auth/login', data).then((r) => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Invalid email or password'));
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post('/auth/logout', {}, { withCredentials: true }).catch(() => {}),
    onSettled: () => {
      // Mark signed out right away and stop in-flight and polling requests, so nothing keeps calling the API
      // (and failing, and trying to refresh) during the short delay below
      setSessionHint(false);
      queryClient.cancelQueries();
      router.push('/auth/login');
      
      // Delay wiping the state so the current page doesn't crash 
      // to a blank screen during the router transition
      setTimeout(() => {
        clearAuth();
        queryClient.clear();
      }, 150);
    },
  });
}

export function useUser() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['user'],
    queryFn: () => api.get<AuthResponse['user']>('/auth/user'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'If an account exists, a reset link has been sent.');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to send reset link'));
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      apiClient.post('/auth/reset-password', data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'Password has been successfully reset');
      router.push('/auth/login');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to reset password'));
    },
  });
}
