import { useQuery } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useAnalyticsQuery(params: any = {}) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["analytics", activeWorkspaceId, params],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const response = await workspaceRequest.get<any>("/analytics", { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}
