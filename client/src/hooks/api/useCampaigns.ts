import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useCampaignsQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["campaigns", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>("/campaigns");
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
      const response = await workspaceRequest.get<any>(`/campaigns/${campaignId}`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
  });
}

// Contacts
export function useContactsQuery(campaignId?: string, params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();
  
  return useQuery({
    queryKey: ["campaign_contacts", activeWorkspaceId, campaignId, params],
    queryFn: async () => {
      if (!activeWorkspaceId || !campaignId) throw new Error("Missing requirements");
      const response = await workspaceRequest.get<any>(`/campaigns/${campaignId}/contacts`, { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!campaignId,
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
    queryClient.invalidateQueries({ queryKey: ["campaign", activeWorkspaceId, campaignId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", activeWorkspaceId] });
  };

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
      return workspaceRequest.post(`/campaigns/${campaignId}/contacts/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
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
    },
  });

  // Integrations mutations
  const toggleIntegration = useMutation({
    mutationFn: async ({ integrationId, is_active }: { integrationId: string; is_active: boolean }) => 
      workspaceRequest.post(`/campaigns/${campaignId}/integrations/${integrationId}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign_integrations", activeWorkspaceId, campaignId] }),
  });

  return {
    updateCampaign,
    transitionStatus,
    regenerateAgent,
    assignPhone,
    deleteCampaign,
    addContact,
    updateContact,
    deleteContact,
    importContacts,
    uploadKnowledgeFile,
    addKnowledgeUrl,
    deleteKnowledge,
    syncKnowledge,
    toggleIntegration,
  };
}
