import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { getSessionHint, useAuthStore } from '@/stores/auth.store';
import { TOKEN_MODE, clearTokens, getTokens, setTokens } from '@/lib/token-store';

export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
};

const API_URL = getApiUrl();

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Cookie mode sends the API's cookies; token mode sends a Bearer header instead and needs no cookies
  withCredentials: !TOKEN_MODE,
});

// Token mode: attach the current access token to every request (also to a retry after a refresh)
apiClient.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

// Response interceptor — handle 401 and token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Credential endpoints return 401 for bad input; refreshing a session makes no sense there
    // and would replace the real error ("Invalid email or password") with the refresh failure.
    const isAuthEndpoint = /\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(originalRequest?.url ?? '');

    // A visitor known to be signed out has nothing to refresh; trying only adds another failing request
    const signedOut = getSessionHint() === '0' || (TOKEN_MODE && !getTokens());

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint && !signedOut) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Token mode sends the refresh token in the body; cookie mode lets the browser send its cookie
        const response = TOKEN_MODE
          ? await axios.post(`${API_URL}/auth/refresh`, { refreshToken: getTokens()?.refreshToken })
          : await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { user, tokens } = response.data.data;
        if (tokens) setTokens(tokens);

        // Optionally update the user in store if needed
        useAuthStore.getState().setAuth(user);
        processQueue(null);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        // Say so only if they were signed in; a first-time visitor with no session has nothing to "expire"
        const hadSession = getSessionHint() === '1';
        clearTokens();
        useAuthStore.getState().clearAuth();
        if (hadSession) toast.error('Your session has expired. Please sign in again.', { id: 'session-expired' });
        // Surface the original failure, not the (less useful) refresh failure
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Pulls a user-facing message out of an API error; the API returns `message` as an array but
// middleware errors and network failures may not.
export const getErrorMessage = (error: any, fallback: string): string => {
  const status = error?.response?.status;
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status === 403) return 'You do not have permission to do that.';
  // No response at all: the API is down or the device is offline
  if (error && !error.response && error.request) return 'Cannot reach the server. Check your connection and try again.';
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message[0] || fallback;
  if (typeof message === 'string' && message) return message;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please check your connection and try again.';
  return fallback;
};

// Type-safe API response unwrapper
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<{ data: T }>(url, config).then((r) => r.data.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<{ data: T }>(url, data, config).then((r) => r.data.data),

  put: <T>(url: string, data?: unknown) =>
    apiClient.put<{ data: T }>(url, data).then((r) => r.data.data),

  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<{ data: T }>(url, data).then((r) => r.data.data),

  delete: <T>(url: string) =>
    apiClient.delete<{ data: T }>(url).then((r) => r.data.data),

  upload: <T>(url: string, formData: FormData) =>
    apiClient
      .post<{ data: T }>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // large files on slow connections exceed the 30s default
      })
      .then((r) => r.data.data),
};
