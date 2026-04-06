import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export function useAuthMutations() {
  const { login: storeLogin } = useAuthStore();

  const login = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/api/v1/auth/login", data);
      return response.data;
    },
    onSuccess: (data) => {
      const { access_token, refresh_token, user } = data;
      storeLogin(access_token, refresh_token, user);
    },
  });

  const signup = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/api/v1/auth/signup", data);
      return response.data;
    },
    onSuccess: (data) => {
      const { access_token, refresh_token, user } = data;
      storeLogin(access_token, refresh_token, user);
    },
  });

  const forgotPassword = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await api.post("/api/v1/auth/forgot-password", data);
      return response.data;
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ token, data }: { token: string; data: any }) => {
      const response = await api.post(`/api/v1/auth/reset-password/${token}`, data);
      return response.data;
    },
  });

  const acceptInvite = useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post(`/api/v1/workspaces/invitations/accept/${token}`);
      return response.data;
    },
  });

  const createWorkspace = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/api/v1/workspaces", data);
      return response.data;
    },
  });

  const oauthCallback = useMutation({
    mutationFn: async (data: { code: string; state: string | null }) => {
      const response = await api.post("/api/v1/workspaces/oauth/callback", data);
      return response.data;
    },
  });

  return { login, signup, forgotPassword, resetPassword, acceptInvite, createWorkspace, oauthCallback };
}
