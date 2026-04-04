import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  fetchWorkspaces: () => Promise<void>;
  init: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      isLoading: false,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      fetchWorkspaces: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get("/api/v1/workspaces");
          set({ workspaces: response.data });
          
          // Set default workspace if none active
          if (!get().activeWorkspaceId && response.data.length > 0) {
            set({ activeWorkspaceId: response.data[0].id });
          }
        } catch (error) {
          console.error("Failed to fetch workspaces:", error);
        } finally {
          set({ isLoading: false });
        }
      },
      init: async () => {
        await get().fetchWorkspaces();
      },
    }),
    {
      name: "dialbridge-workspace-storage",
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    }
  )
);
