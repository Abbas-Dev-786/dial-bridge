import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useAgentsQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["agents", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/agents");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useAgentDetailQuery(agentId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["agent", activeWorkspaceId, agentId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      if (!agentId) throw new Error("No agent ID");
      const response = await workspaceRequest.get<any>(`/agents/${agentId}`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!agentId,
  });
}

export function useAgentMutations(agentId?: string) {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const updateAgent = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.patch(`/agents/${agentId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", activeWorkspaceId, agentId] });
      queryClient.invalidateQueries({ queryKey: ["agents", activeWorkspaceId] });
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async () => {
      await workspaceRequest.delete(`/agents/${agentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", activeWorkspaceId] });
    },
  });

  return { updateAgent, deleteAgent };
}
