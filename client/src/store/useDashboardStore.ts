import { create } from "zustand";

interface DashboardState {
  hasAgents: boolean;
  hasCampaigns: boolean;
  completedSteps: number;
  showOnboarding: boolean;
  setHasAgents: (val: boolean) => void;
  setHasCampaigns: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  hasAgents: true,
  hasCampaigns: true,
  completedSteps: 3,
  showOnboarding: false,
  setHasAgents: (val) => set((state) => {
    const completed = val && state.hasCampaigns ? 3 : val ? 1 : 0;
    return { hasAgents: val, completedSteps: completed, showOnboarding: completed < 3 };
  }),
  setHasCampaigns: (val) => set((state) => {
    const completed = state.hasAgents && val ? 3 : state.hasAgents ? 1 : 0;
    return { hasCampaigns: val, completedSteps: completed, showOnboarding: completed < 3 };
  }),
}));
