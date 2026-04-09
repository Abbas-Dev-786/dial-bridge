import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

type AuthTokensResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type UserResponse = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
};

type AuthPayload = {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
};

const bareApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

async function buildAuthPayload(tokens: AuthTokensResponse): Promise<AuthPayload> {
  const meResponse = await bareApi.get<UserResponse>("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    user: meResponse.data,
  };
}

export function useAuthMutations() {
  const { login: storeLogin } = useAuthStore();

  const login = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await api.post<AuthTokensResponse>("/api/v1/auth/login", data);
      return await buildAuthPayload(response.data);
    },
    onSuccess: (data) => {
      const { access_token, refresh_token, user } = data;
      storeLogin(access_token, refresh_token, user);
    },
  });

  const signup = useMutation({
    mutationFn: async (data: { email: string; password: string; full_name: string }) => {
      await api.post("/api/v1/auth/register", data);
      const loginResponse = await api.post<AuthTokensResponse>("/api/v1/auth/login", {
        email: data.email,
        password: data.password,
      });
      return await buildAuthPayload(loginResponse.data);
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
    mutationFn: async ({ token, new_password }: { token: string; new_password: string }) => {
      const response = await api.post("/api/v1/auth/reset-password", {
        token,
        new_password,
      });
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

  const googleLogin = useMutation({
    mutationFn: async (data: { id_token: string }) => {
      const response = await api.post<AuthTokensResponse>("/api/v1/auth/google", data);
      return await buildAuthPayload(response.data);
    },
    onSuccess: (data) => {
      const { access_token, refresh_token, user } = data;
      storeLogin(access_token, refresh_token, user);
    },
  });

  return {
    login,
    signup,
    googleLogin,
    forgotPassword,
    resetPassword,
    acceptInvite,
    createWorkspace,
    oauthCallback,
  };
}
