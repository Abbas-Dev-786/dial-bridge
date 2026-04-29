import { useMutation, useQuery } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export interface TestSessionResponse {
  token: string;
}

export interface TestSignedUrlResponse {
  signed_url: string;
}

export interface TestConversationResponse {
  conversation_id: string;
  status: string;
  agent_id: string;
  duration_seconds: number;
  transcript: Array<{
    role: string;
    message: string;
  }>;
  audio_url?: string;
  [key: string]: any;
}

export function useAgentTest(agentId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  const startTestSession = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId || !agentId) throw new Error("Missing workspace or agent ID");
      const { data } = await workspaceRequest.post<TestSessionResponse>(
        `/agents/${agentId}/test/session`
      );
      return data;
    },
  });

  const startTestSignedUrlSession = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId || !agentId) throw new Error("Missing workspace or agent ID");
      const { data } = await workspaceRequest.post<TestSignedUrlResponse>(
        `/agents/${agentId}/test/signed-url`
      );
      return data;
    },
  });

  const testAgentViaPhone = useMutation({
    mutationFn: async (payload: { to_number: string; phone_number_id: string }) => {
      if (!activeWorkspaceId || !agentId) throw new Error("Missing workspace or agent ID");
      const { data } = await workspaceRequest.post<{ status: string; conversation_id?: string }>(
        `/agents/${agentId}/test-call`,
        payload
      );
      return data;
    },
  });

  const useTestConversation = (conversationId?: string) => {
    return useQuery({
      queryKey: ["agent-test-conversation", activeWorkspaceId, agentId, conversationId],
      queryFn: async () => {
        if (!activeWorkspaceId || !agentId || !conversationId) return null;
        const { data } = await workspaceRequest.get<TestConversationResponse>(
          `/agents/${agentId}/test/conversations/${conversationId}`
        );
        return data;
      },
      enabled: !!activeWorkspaceId && !!agentId && !!conversationId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === "done" || data.status === "failed")) {
          return false;
        }
        return 3000;
      },
    });
  };

  return {
    startTestSession,
    startTestSignedUrlSession,
    testAgentViaPhone,
    useTestConversation,
  };
}
