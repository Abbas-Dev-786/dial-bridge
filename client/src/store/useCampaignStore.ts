import { create } from "zustand";
import { INITIAL_CONTACTS, CAMPAIGN_INTEGRATIONS } from "@/lib/mockData";

export type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "completed" | "archived";

interface CampaignState {
  activeTab: string;
  campaignStatus: CampaignStatus;
  contacts: any[];
  integrationToggles: Record<string, boolean>;
  dialogStates: Record<string, boolean>;
  selectedIntegration: { name: string; icon: string; description: string } | null;
  setActiveTab: (tab: string) => void;
  setCampaignStatus: (status: CampaignStatus) => void;
  handleStatusTransition: (status: CampaignStatus) => void;
  setContacts: (contacts: any[]) => void;
  setIntegrationToggles: (toggles: Record<string, boolean>) => void;
  setDialogState: (dialog: string, open: boolean) => void;
  setSelectedIntegration: (integration: { name: string; icon: string; description: string } | null) => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  activeTab: "dashboard",
  campaignStatus: "live",
  contacts: INITIAL_CONTACTS,
  integrationToggles: Object.fromEntries(CAMPAIGN_INTEGRATIONS.map(i => [i.id, i.enabled])),
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
  setCampaignStatus: (status) => set({ campaignStatus: status }),
  handleStatusTransition: (status) => set({ campaignStatus: status }),
  setContacts: (contacts) => set({ contacts }),
  setIntegrationToggles: (toggles) => set({ integrationToggles: toggles }),
  setDialogState: (dialog, open) => set((state) => ({ 
    dialogStates: { ...state.dialogStates, [dialog]: open } 
  })),
  setSelectedIntegration: (integration) => set({ selectedIntegration: integration }),
}));
