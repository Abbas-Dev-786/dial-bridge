import { useMutation, useQuery } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useAgentTest(agentId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  const startTestSession = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId || !agentId) throw new Error("Missing workspace or agent ID");
      const { data } = await workspaceRequest.post(
        `/agents/${agentId}/test/session`
      );
      return data; // { signed_url: string }
    },
  });

  const useTestConversation = (conversationId?: string) => {
    return useQuery({
      queryKey: ["agent-test-conversation", activeWorkspaceId, agentId, conversationId],
      queryFn: async () => {
        if (!activeWorkspaceId || !agentId || !conversationId) return null;
        const { data } = await workspaceRequest.get(
          `/agents/${agentId}/test/conversations/${conversationId}`
        );
        return data;
      },
      enabled: !!activeWorkspaceId && !!agentId && !!conversationId,
      refetchInterval: (query) => {
        // Polling: continue polling if status is not 'done' or 'failed'
        const data = query.state.data as any;
        if (data && (data.status === "done" || data.status === "failed")) {
          return false;
        }
        return 3000; // Poll every 3 seconds
      },
    });
  };

  return {
    startTestSession,
    useTestConversation,
  };
}
