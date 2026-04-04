import { create } from "zustand";
import { persist } from "zustand/middleware";
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
