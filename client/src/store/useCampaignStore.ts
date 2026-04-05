import { create } from "zustand";
import { workspaceRequest } from "@/lib/api";

export type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "completed" | "archived";

interface CampaignState {
  activeTab: string;
  activeCampaign: any | null;
  campaignStatus: CampaignStatus;
  contactsData: {
    items: any[];
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
  };
  knowledgeDocs: any[];
  integrations: any[];
  analytics: any | null;
  isLoading: boolean;
  dialogStates: Record<string, boolean>;
  selectedIntegration: any | null;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setDialogState: (dialog: string, open: boolean) => void;
  setSelectedIntegration: (integration: any | null) => void;
  
  fetchCampaign: (campaignId: string) => Promise<void>;
  updateCampaign: (campaignId: string, data: any) => Promise<void>;
  transitionStatus: (campaignId: string, status: CampaignStatus) => Promise<void>;
  regenerateAgent: (campaignId: string) => Promise<void>;
  assignPhone: (campaignId: string, phoneNumberId: string) => Promise<void>;
  
  fetchContacts: (campaignId: string, params?: any) => Promise<void>;
  addContact: (campaignId: string, data: any) => Promise<void>;
  updateContact: (campaignId: string, contactId: string, data: any) => Promise<void>;
  deleteContact: (campaignId: string, contactId: string) => Promise<void>;
  importContacts: (campaignId: string, file: File) => Promise<void>;
  
  fetchKnowledge: (campaignId: string) => Promise<void>;
  uploadKnowledgeFile: (campaignId: string, file: File) => Promise<void>;
  addKnowledgeUrl: (campaignId: string, data: any) => Promise<void>;
  deleteKnowledge: (campaignId: string, docId: string) => Promise<void>;
  syncKnowledge: (campaignId: string) => Promise<void>;
  
  fetchIntegrations: (campaignId: string) => Promise<void>;
  toggleIntegration: (campaignId: string, integrationId: string, active: boolean) => Promise<void>;
  
  fetchAnalytics: (campaignId: string, dateFrom?: string, dateTo?: string) => Promise<void>;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  activeTab: "dashboard",
  activeCampaign: null,
  campaignStatus: "live",
  contactsData: {
    items: [],
    total: 0,
    page: 1,
    page_size: 50,
    has_next: false,
  },
  knowledgeDocs: [],
  integrations: [],
  analytics: null,
  isLoading: false,
  dialogStates: {
    buyNumber: false,
    uploadDoc: false,
    uploadContacts: false,
    addContact: false,
    importContacts: false,
    connectIntegration: false,
    export: false,
    deleteConfirm: false,
  },
  selectedIntegration: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setDialogState: (dialog, open) => set((state) => ({ 
    dialogStates: { ...state.dialogStates, [dialog]: open } 
  })),
  setSelectedIntegration: (integration) => set({ selectedIntegration: integration }),

  fetchCampaign: async (campaignId) => {
    set({ isLoading: true });
    try {
      const res = await workspaceRequest.get<any>(`/campaigns/${campaignId}`);
      set({ activeCampaign: res.data, campaignStatus: res.data.status });
    } finally {
      set({ isLoading: false });
    }
  },

  updateCampaign: async (campaignId, data) => {
    const res = await workspaceRequest.patch<any>(`/campaigns/${campaignId}`, data);
    set({ activeCampaign: res.data, campaignStatus: res.data.status });
  },

  transitionStatus: async (campaignId, status) => {
    const res = await workspaceRequest.post<any>(`/campaigns/${campaignId}/status`, { status });
    set({ activeCampaign: res.data, campaignStatus: res.data.status });
  },

  regenerateAgent: async (campaignId) => {
    const res = await workspaceRequest.post<any>(`/campaigns/${campaignId}/regenerate-agent`, {});
    set({ activeCampaign: res.data });
  },

  assignPhone: async (campaignId, phone_number_id) => {
    const res = await workspaceRequest.post<any>(`/campaigns/${campaignId}/assign-phone`, { phone_number_id });
    set({ activeCampaign: res.data });
  },

  fetchContacts: async (campaignId, params = {}) => {
    const res = await workspaceRequest.get<any>(`/campaigns/${campaignId}/contacts`, { params });
    set({ contactsData: res.data });
  },

  addContact: async (campaignId, data) => {
    await workspaceRequest.post(`/campaigns/${campaignId}/contacts`, data);
    get().fetchContacts(campaignId);
  },

  updateContact: async (campaignId, contactId, data) => {
    await workspaceRequest.patch(`/campaigns/${campaignId}/contacts/${contactId}`, data);
    get().fetchContacts(campaignId);
  },

  deleteContact: async (campaignId, contactId) => {
    await workspaceRequest.delete(`/campaigns/${campaignId}/contacts/${contactId}`);
    get().fetchContacts(campaignId);
  },

  importContacts: async (campaignId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    await workspaceRequest.post(`/campaigns/${campaignId}/contacts/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    get().fetchContacts(campaignId);
  },

  fetchKnowledge: async (campaignId) => {
    const res = await workspaceRequest.get<any[]>(`/campaigns/${campaignId}/knowledge`);
    set({ knowledgeDocs: res.data });
  },

  uploadKnowledgeFile: async (campaignId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    await workspaceRequest.post(`/campaigns/${campaignId}/knowledge/file`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    get().fetchKnowledge(campaignId);
  },

  addKnowledgeUrl: async (campaignId, data) => {
    await workspaceRequest.post(`/campaigns/${campaignId}/knowledge/url`, data);
    get().fetchKnowledge(campaignId);
  },

  deleteKnowledge: async (campaignId, docId) => {
    await workspaceRequest.delete(`/campaigns/${campaignId}/knowledge/${docId}`);
    get().fetchKnowledge(campaignId);
  },

  syncKnowledge: async (campaignId) => {
    const res = await workspaceRequest.post<any>(`/campaigns/${campaignId}/knowledge/sync`, {});
    // sync status is in activeCampaign usually, but the sync call returns it too
    set((state) => ({
      activeCampaign: state.activeCampaign ? { ...state.activeCampaign, kb_sync_status: res.data.status } : null
    }));
  },

  fetchIntegrations: async (campaignId) => {
    const res = await workspaceRequest.get<any[]>(`/campaigns/${campaignId}/integrations`);
    set({ integrations: res.data });
  },

  toggleIntegration: async (campaignId, integrationId, is_active) => {
    await workspaceRequest.post(`/campaigns/${campaignId}/integrations/${integrationId}`, { is_active });
    get().fetchIntegrations(campaignId);
  },

  fetchAnalytics: async (campaignId, dateFrom, dateTo) => {
    // Analytics is workspace-level but can filter by campaign
    const params: any = { campaign_id: campaignId };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    // workspaceRequest.get prepends /api/v1/workspaces/{wid}
    // and the endpoint is /api/v1/workspaces/{wid}/analytics
    const res = await workspaceRequest.get<any>(`/analytics`, { params });
    set({ analytics: res.data });
  },
}));
