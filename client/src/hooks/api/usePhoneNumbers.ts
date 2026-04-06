import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function usePhoneNumbersQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["phone-numbers", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/phone-numbers");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useAvailableElevenLabsNumbersQuery(enabledOptions = true) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["elevenlabs-available-numbers", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/phone-numbers/elevenlabs-available");
      return response.data;
    },
    enabled: !!activeWorkspaceId && enabledOptions,
  });
}

export function usePhoneNumberDetailQuery(numberId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["phone-number", activeWorkspaceId, numberId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      if (!numberId) throw new Error("No number ID");
      const response = await workspaceRequest.get<any>(`/phone-numbers/${numberId}`);
      return response.data;
    },
    enabled: !!activeWorkspaceId && !!numberId,
  });
}

export function usePhoneNumberMutations(numberId?: string) {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const importElevenLabsNumber = useMutation({
    mutationFn: async (data: { elevenlabs_number_id: string; friendly_name?: string }) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.post("/phone-numbers/import-elevenlabs", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["elevenlabs-available-numbers", activeWorkspaceId] });
    },
  });

  const importSIPTrunk = useMutation({
    mutationFn: async (data: any) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.post("/phone-numbers/import-sip", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers", activeWorkspaceId] });
    },
  });

  const updateNumber = useMutation({
    mutationFn: async (data: any) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.patch(`/phone-numbers/${numberId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers", activeWorkspaceId] });
      if (numberId) {
        queryClient.invalidateQueries({ queryKey: ["phone-number", activeWorkspaceId, numberId] });
      }
    },
  });

  const releaseNumber = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      await workspaceRequest.delete(`/phone-numbers/${numberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers", activeWorkspaceId] });
    },
  });

  return { 
    importElevenLabsNumber, 
    importSIPTrunk, 
    updateNumber, 
    releaseNumber 
  };
}
