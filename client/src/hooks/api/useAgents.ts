import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useVoicesQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["voices", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/voices");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

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

  const createAgent = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.post("/agents", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", activeWorkspaceId] });
    },
  });

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

  const updateVoiceConfig = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.patch(`/agents/${agentId}/voice-config`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", activeWorkspaceId, agentId] });
    },
  });

  const updateConversationConfig = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.patch(`/agents/${agentId}/conversation-config`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", activeWorkspaceId, agentId] });
    },
  });

  const addTool = useMutation({
    mutationFn: async (data: any) => {
      const response = await workspaceRequest.post(`/agents/${agentId}/tools`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", activeWorkspaceId, agentId] });
    },
  });

  const updateTool = useMutation({
    mutationFn: async ({ toolId, data }: { toolId: string; data: any }) => {
      const response = await workspaceRequest.patch(`/agents/${agentId}/tools/${toolId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", activeWorkspaceId, agentId] });
    },
  });

  const deleteTool = useMutation({
    mutationFn: async (toolId: string) => {
      await workspaceRequest.delete(`/agents/${agentId}/tools/${toolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", activeWorkspaceId, agentId] });
    },
  });

  return { 
    createAgent, 
    updateAgent, 
    deleteAgent, 
    updateVoiceConfig, 
    updateConversationConfig,
    addTool,
    updateTool,
    deleteTool
  };
}
