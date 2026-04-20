import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "completed" | "archived";

export interface ImproveGoalResponse {
  improved_goal_description: string;
  was_improved: boolean;
  warning: string | null;
}

export interface CampaignSummary {
  id: string;
  name: string;
  goal_description?: string;
  caller_id_display_name?: string;
  timezone?: string;
  schedule_days?: string[];
  schedule_start_time?: string;
  schedule_end_time?: string;
  start_date?: string | null;
  end_date?: string | null;
  max_concurrency?: number;
  max_retries?: number;
  retry_delay_minutes?: number;
  retry_on_outcomes?: string[];
  dnc_check_enabled?: boolean;
  record_calls?: boolean;
  tcpa_mode?: boolean;
  voicemail_detection?: boolean;
  leave_voicemail?: boolean;
  status: CampaignStatus;
  agent_name: string | null;
  phone_number: string | null;
  contacts_total: number;
  contacts_called: number;
  contacts_remaining: number;
  contacts_pending: number;
  contacts_calling: number;
  contacts_reached: number;
  calls_successful: number;
  calls_failed: number;
  total_spend_cents: number;
}

export function getLiveCampaignRefetchInterval(
  status?: string,
  isDocumentHidden: boolean = typeof document !== "undefined" ? document.hidden : false,
) {
  if (isDocumentHidden) return false;
  return status === "live" ? 5000 : false;
}

export function useCampaignsQuery(params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["campaigns", activeWorkspaceId, params],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>("/campaigns", { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useCampaignDetailQuery(campaignId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["campaign", activeWorkspaceId, campaignId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      if (!campaignId) throw new Error("No campaign ID");
      const response = await workspaceRequest.get<CampaignSummary>(`/campaigns/${campaignId}`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
    refetchInterval: (query) => getLiveCampaignRefetchInterval(query.state.data?.status),
    refetchIntervalInBackground: false,
  });
}

// Calls
export function useCampaignCallsQuery(campaignId?: string, params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ["campaign_calls", activeWorkspaceId, campaignId, params],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any>(`/campaigns/${campaignId}/calls`, { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
    refetchInterval: () => {
      const campaign = queryClient.getQueryData<CampaignSummary>(["campaign", activeWorkspaceId, campaignId]);
      return getLiveCampaignRefetchInterval(campaign?.status);
    },
    refetchIntervalInBackground: false,
  });
}

// Contacts
export function useContactsQuery(campaignId?: string, params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ["campaign_contacts", activeWorkspaceId, campaignId, params],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any>(`/campaigns/${campaignId}/contacts`, { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
    refetchInterval: () => {
      const campaign = queryClient.getQueryData<CampaignSummary>(["campaign", activeWorkspaceId, campaignId]);
      return getLiveCampaignRefetchInterval(campaign?.status);
    },
    refetchIntervalInBackground: false,
  });
}

// Knowledge Base
export function useKnowledgeQuery(campaignId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();
  
  return useQuery({
    queryKey: ["campaign_knowledge", activeWorkspaceId, campaignId],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any[]>(`/campaigns/${campaignId}/knowledge`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
  });
}

export function useKnowledgeSyncStatusQuery(campaignId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();
  
  return useQuery({
    queryKey: ["campaign_knowledge_sync", activeWorkspaceId, campaignId],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any>(`/campaigns/${campaignId}/knowledge/sync-status`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
    refetchInterval: (query) => (query.state.data?.status === 'syncing' ? 3000 : false),
  });
}

export function useKnowledgeSnapshotsQuery(campaignId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();
  
  return useQuery({
    queryKey: ["campaign_knowledge_snapshots", activeWorkspaceId, campaignId],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any[]>(`/campaigns/${campaignId}/knowledge/snapshots`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
  });
}

// Analytics
export function useCampaignAnalyticsQuery(campaignId?: string, params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();
  
  return useQuery({
    queryKey: ["campaign_analytics", activeWorkspaceId, campaignId, params],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any>(`/campaigns/${campaignId}/analytics`, { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
  });
}

// Integrations
export function useCampaignIntegrationsQuery(campaignId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();
  
  return useQuery({
    queryKey: ["campaign_integrations", activeWorkspaceId, campaignId],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any[]>(`/campaigns/${campaignId}/integrations`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
  });
}

// Mutations
export function useCampaignMutations(campaignId?: string) {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const invalidateCampaign = () => {
    queryClient.invalidateQueries({ queryKey: ["campaigns", activeWorkspaceId] });
    if (campaignId) queryClient.invalidateQueries({ queryKey: ["campaign", activeWorkspaceId, campaignId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", activeWorkspaceId] });
  };

  const createCampaign = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.post("/campaigns", data);
      return response.data;
    },
    onSuccess: invalidateCampaign,
  });

  const improveGoal = useMutation({
    mutationFn: async (goal_description: string) => {
      const response = await workspaceRequest.post<ImproveGoalResponse>("/campaigns/improve-goal", {
        goal_description,
      });
      return response.data;
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.patch(`/campaigns/${campaignId}`, data);
      return response.data;
    },
    onSuccess: invalidateCampaign,
  });

  const transitionStatus = useMutation({
    mutationFn: async (status: string) => {
      const response = await workspaceRequest.post(`/campaigns/${campaignId}/status`, { status });
      return response.data;
    },
    onSuccess: invalidateCampaign,
  });

  const regenerateAgent = useMutation({
    mutationFn: async () => {
      const response = await workspaceRequest.post(`/campaigns/${campaignId}/regenerate-agent`, {});
      return response.data;
    },
    onSuccess: invalidateCampaign,
  });

  const assignPhone = useMutation({
    mutationFn: async (phone_number_id: string) => {
      const response = await workspaceRequest.post(`/campaigns/${campaignId}/assign-phone`, { phone_number_id });
      return response.data;
    },
    onSuccess: invalidateCampaign,
  });

  const deleteCampaign = useMutation({
    mutationFn: async () => workspaceRequest.delete(`/campaigns/${campaignId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", activeWorkspaceId] });
    },
  });

  // Contact mutations
  const addContact = useMutation({
    mutationFn: async (data: any) => workspaceRequest.post(`/campaigns/${campaignId}/contacts`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_contacts", activeWorkspaceId, campaignId] }),
  });

  const updateContact = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: any }) => 
      workspaceRequest.patch(`/campaigns/${campaignId}/contacts/${contactId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_contacts", activeWorkspaceId, campaignId] }),
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => 
      workspaceRequest.delete(`/campaigns/${campaignId}/contacts/${contactId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_contacts", activeWorkspaceId, campaignId] }),
  });

  const importContacts = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return workspaceRequest.post(`/campaigns/${campaignId}/contacts/import-csv`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_contacts", activeWorkspaceId, campaignId] }),
  });

  const exportContacts = useMutation({
    mutationFn: async () => {
      const response = await workspaceRequest.get(`/campaigns/${campaignId}/contacts/export`, {
        responseType: 'blob'
      });
      return response.data;
    },
  });

  const markContactDNC = useMutation({
    mutationFn: async (contactId: string) => 
      workspaceRequest.post(`/campaigns/${campaignId}/contacts/${contactId}/mark-dnc`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_contacts", activeWorkspaceId, campaignId] }),
  });

  // Knowledge mutations
  const uploadKnowledgeFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return workspaceRequest.post(`/campaigns/${campaignId}/knowledge/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_knowledge", activeWorkspaceId, campaignId] }),
  });

  const addKnowledgeUrl = useMutation({
    mutationFn: async (data: any) => workspaceRequest.post(`/campaigns/${campaignId}/knowledge/url`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_knowledge", activeWorkspaceId, campaignId] }),
  });

  const deleteKnowledge = useMutation({
    mutationFn: async (docId: string) => workspaceRequest.delete(`/campaigns/${campaignId}/knowledge/${docId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_knowledge", activeWorkspaceId, campaignId] }),
  });

  const syncKnowledge = useMutation({
    mutationFn: async () => workspaceRequest.post(`/campaigns/${campaignId}/knowledge/sync`, {}),
    onSuccess: () => {
        invalidateCampaign();
        queryClient.invalidateQueries({ queryKey: ["campaign_knowledge", activeWorkspaceId, campaignId] });
        queryClient.invalidateQueries({ queryKey: ["campaign_knowledge_sync", activeWorkspaceId, campaignId] });
    },
  });

  // Integrations mutations
  const toggleIntegration = useMutation({
    mutationFn: async ({ integrationId, is_active }: { integrationId: string; is_active: boolean }) => 
      workspaceRequest.post(`/campaigns/${campaignId}/integrations/${integrationId}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_integrations", activeWorkspaceId, campaignId] }),
  });

  const deleteCampaignIntegration = useMutation({
    mutationFn: async (integrationId: string) => 
      workspaceRequest.delete(`/campaigns/${campaignId}/integrations/${integrationId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_integrations", activeWorkspaceId, campaignId] }),
  });

  return {
    createCampaign,
    improveGoal,
    updateCampaign,
    transitionStatus,
    regenerateAgent,
    assignPhone,
    deleteCampaign,
    addContact,
    updateContact,
    deleteContact,
    importContacts,
    exportContacts,
    markContactDNC,
    uploadKnowledgeFile,
    addKnowledgeUrl,
    deleteKnowledge,
    syncKnowledge,
    toggleIntegration,
    deleteCampaignIntegration,
  };
}
