import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useNotificationPreferencesQuery() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["notification_preferences", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any[]>("/notifications/preferences");
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const updatePreference = useMutation({
    mutationFn: async ({ event_type, ...data }: { event_type: string; channel_email?: boolean; channel_slack?: boolean; channel_webhook?: boolean }) => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.put(`/notifications/preferences/${event_type}`, {
        event_type,
        ...data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_preferences", activeWorkspaceId] });
    },
  });

  return { updatePreference };
}
