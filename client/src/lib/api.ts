import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// We will set up interceptors dynamically to avoid circular dependencies
export const setupInterceptors = (
  getToken: () => string | null,
  getWorkspaceId: () => string | null,
  onLogout: () => void
) => {
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
      if (error.response?.status === 401) {
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
