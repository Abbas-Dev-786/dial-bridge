import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, refresh_token: string, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  refreshTokens: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refresh_token: null,
      isAuthenticated: false,
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setRefreshToken: (refresh_token) => set({ refresh_token }),
      setUser: (user) => set({ user }),
      login: (token, refresh_token, user) => {
        set({ token, refresh_token, user, isAuthenticated: true });
      },
      logout: () => {
        set({ user: null, token: null, refresh_token: null, isAuthenticated: false });
        // Optional: window.location.href = "/login";
      },
      fetchMe: async () => {
        try {
          const response = await api.get("/api/v1/auth/me");
          set({ user: response.data, isAuthenticated: true });
        } catch (error) {
          console.error("Failed to fetch user:", error);
          get().logout();
        }
      },
      refreshTokens: async () => {
        const refreshToken = get().refresh_token;
        if (!refreshToken) return null;

        try {
          // Use a plain client so refresh cannot recurse into the auth interceptor queue.
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/auth/refresh`,
            {
            refresh_token: refreshToken,
            }
          );

          const { access_token, refresh_token: newRefreshToken } = response.data;
          set({ 
            token: access_token, 
            refresh_token: newRefreshToken, 
            isAuthenticated: true 
          });
          return access_token;
        } catch (error) {
          console.error("Token refresh failed:", error);
          get().logout();
          return null;
        }
      },
    }),
    {
      name: "dialbridge-auth-storage",
      partialize: (state) => ({ 
        token: state.token, 
        refresh_token: state.refresh_token,
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
