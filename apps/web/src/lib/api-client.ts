import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

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
  withCredentials: true,
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

    if (error.response?.status === 401 && !originalRequest._retry) {
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
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { user } = response.data.data;

        // Optionally update the user in store if needed
        useAuthStore.getState().setAuth(user);
        processQueue(null);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

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
      })
      .then((r) => r.data.data),
};
