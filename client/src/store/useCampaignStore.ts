import { create } from "zustand";

export type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "completed" | "archived";

interface CampaignState {
  activeTab: string;
  dialogStates: Record<string, boolean>;
  selectedIntegration: any | null;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setDialogState: (dialog: string, open: boolean) => void;
  setSelectedIntegration: (integration: any | null) => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  activeTab: "dashboard",
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
}));
