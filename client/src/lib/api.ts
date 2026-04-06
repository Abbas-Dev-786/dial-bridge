import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// We will set up interceptors dynamically to avoid circular dependencies
export const setupInterceptors = (
  getToken: () => string | null,
  getWorkspaceId: () => string | null,
  onLogout: () => void,
  onRefresh: () => Promise<string | null>
) => {
  // Clear any existing interceptors to avoid duplication (especially during HMR)
  (api.interceptors.request as any).handlers = [];
  (api.interceptors.response as any).handlers = [];

  api.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 (Unauthorized) - Attempt Refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await onRefresh();
          if (newToken) {
            // Update the Authorization header with the new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            processQueue(null, newToken);
            return api(originalRequest);
          } else {
            onLogout();
            processQueue(new Error("Token refresh failed"), null);
            return Promise.reject(error);
          }
        } catch (refreshError) {
          onLogout();
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Handle 403 (Forbidden) - Logout immediately
      if (error.response?.status === 403) {
        onLogout();
      }

      return Promise.reject(error);
    }
  );
};

/**
 * Utility for workspace-scoped requests.
 * Automatically prepends `/api/v1/workspaces/{workspace_id}` to the URL.
 */
export const workspaceRequest = {
  get: <T>(url: string, config = {}) => {
    // This is still a bit tricky if we want to avoid importing useWorkspaceStore here.
    // We can pass a getter or just use the one we'll have in a global ref.
    const workspaceId = (window as any).getActiveWorkspaceId?.();
    if (!workspaceId) throw new Error("No active workspace selected");
    return api.get<T>(`/api/v1/workspaces/${workspaceId}${url}`, config);
  },
  post: <T>(url: string, data?: any, config = {}) => {
    const workspaceId = (window as any).getActiveWorkspaceId?.();
    if (!workspaceId) throw new Error("No active workspace selected");
    return api.post<T>(`/api/v1/workspaces/${workspaceId}${url}`, data, config);
  },
  patch: <T>(url: string, data?: any, config = {}) => {
    const workspaceId = (window as any).getActiveWorkspaceId?.();
    if (!workspaceId) throw new Error("No active workspace selected");
    return api.patch<T>(`/api/v1/workspaces/${workspaceId}${url}`, data, config);
  },
  delete: <T>(url: string, config = {}) => {
    const workspaceId = (window as any).getActiveWorkspaceId?.();
    if (!workspaceId) throw new Error("No active workspace selected");
    return api.delete<T>(`/api/v1/workspaces/${workspaceId}${url}`, config);
  },
};

export default api;
