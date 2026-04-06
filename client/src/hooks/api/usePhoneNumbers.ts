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

export function useImportElevenLabsNumberMutation() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  return useMutation({
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
}
