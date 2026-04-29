import { useQuery } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export interface ConversationSummary {
  conversation_id: string;
  status: string;
  agent_id: string;
  start_time_unix_secs: number;
  duration_seconds: number;
  message_count: number;
  call_successful?: string;
  conversation_type?: string;
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
}

export function useConversationHistoryQuery(agentId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["agent-conversation-history", activeWorkspaceId, agentId],
    queryFn: async () => {
      if (!activeWorkspaceId || !agentId) throw new Error("Missing workspace or agent ID");
      const { data } = await workspaceRequest.get<ConversationListResponse>(
        `/agents/${agentId}/conversations`
      );
      return data;
    },
    enabled: !!activeWorkspaceId && !!agentId,
  });
}

export function useConversationDetailQuery(agentId?: string, conversationId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["agent-conversation-detail", activeWorkspaceId, agentId, conversationId],
    queryFn: async () => {
      if (!activeWorkspaceId || !agentId || !conversationId) return null;
      const { data } = await workspaceRequest.get<any>(
        `/agents/${agentId}/conversations/${conversationId}`
      );
      return data;
    },
    enabled: !!activeWorkspaceId && !!agentId && !!conversationId,
  });
}
