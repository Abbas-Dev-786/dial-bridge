import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

// --- Members ---
export function useMembersQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["members", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/members");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useMemberMutations() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await workspaceRequest.delete(`/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await workspaceRequest.patch(`/members/${userId}`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
    },
  });

  const inviteMember = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await workspaceRequest.post("/members/invite", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
    },
  });

  return { removeMember, updateRole, inviteMember };
}

// --- Integrations ---
export function useIntegrationProvidersQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["integration-providers", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/integrations/providers");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useWorkspaceIntegrationsQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["workspace-integrations", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/integrations");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useIntegrationMutations() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const initiateOAuth = useMutation({
    mutationFn: async (providerKey: string) => {
      const response = await workspaceRequest.get<{ authorization_url: string }>(`/integrations/${providerKey}/oauth/initiate`);
      return response.data.authorization_url;
    },
  });

  const disconnectIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      await workspaceRequest.delete(`/integrations/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-integrations", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["campaign_integrations", activeWorkspaceId] }); // invalidates all campaign integrations
    },
  });

  const connectIntegration = useMutation({
    mutationFn: async ({ providerKey, data }: { providerKey: string; data: any }) => {
      const type = data.api_key ? "api-key" : "webhook";
      const response = await workspaceRequest.post(`/integrations/${providerKey}/connect-${type}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-integrations", activeWorkspaceId] });
    },
  });

  return { initiateOAuth, disconnectIntegration, connectIntegration };
}

// --- Audit Logs ---
export function useAuditLogsQuery(params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["audit-logs", activeWorkspaceId, params],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>("/audit-logs", { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

// --- Workspace Settings ---
export function useWorkspaceProfileQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["workspace-profile", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>(""); // workspaceRequest puts /workspaces/{id} as baseURL
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useElevenLabsStatusQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["elevenlabs-status", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>("/settings/elevenlabs-status");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useWorkspaceMutations() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const updateWorkspace = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.patch("", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-profile", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      await workspaceRequest.delete("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  return { updateWorkspace, deleteWorkspace };
}

// --- Workspace Webhooks ---
export function useWebhooksQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["webhooks", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/webhooks/endpoints");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useWebhookMutations() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const addWebhook = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.post("/webhooks/endpoints", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", activeWorkspaceId] });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (webhookId: string) => {
      await workspaceRequest.delete(`/webhooks/endpoints/${webhookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", activeWorkspaceId] });
    },
  });

  const retryDelivery = useMutation({
    mutationFn: async (deliveryId: string) => {
      const response = await workspaceRequest.post(`/webhooks/deliveries/${deliveryId}/retry`);
      return response.data;
    },
    onSuccess: () => {
      // Typically we'd invalidate deliveries here, but the list might be named "webhook-logs"
      queryClient.invalidateQueries({ queryKey: ["webhook-logs", activeWorkspaceId] });
    },
  });

  return { addWebhook, deleteWebhook, retryDelivery };
}

// --- Webhook Logs ---
export function useWebhookLogsQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["webhook-logs", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>("/webhooks/deliveries");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

// --- API Keys ---
export function useApiKeysQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["api-keys", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/api-keys");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useApiKeyMutations() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const generateApiKey = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await workspaceRequest.post("/api-keys", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", activeWorkspaceId] });
    },
  });

  const revokeApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      await workspaceRequest.delete(`/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", activeWorkspaceId] });
    },
  });

  return { generateApiKey, revokeApiKey };
}
