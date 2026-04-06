import { useQuery } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export interface CallListItem {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  agent_name: string | null;
  campaign_name: string | null;
  direction: string;
  status: string;
  duration_seconds: number | null;
  total_cost_cents: number;
  created_at: string;
}

export interface CallsResponse {
  items: CallListItem[];
  total: number;
  page: number;
  page_size: number;
}

export function useCallsQuery(page: number, campaignId?: string, statusFilter?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["calls", activeWorkspaceId, page, campaignId, statusFilter],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      
      const params: any = {
        page,
        page_size: 20,
      };
      if (campaignId && campaignId !== "all") params.campaign_id = campaignId;
      if (statusFilter && statusFilter !== "all") params.status = [statusFilter];

      const response = await workspaceRequest.get<CallsResponse>("/calls", { params });
      return response.data;
    },
    enabled: !!activeWorkspaceId,
  });
}

export function useCallDetailQuery(callId?: string) {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["call", activeWorkspaceId, callId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      if (!callId) throw new Error("No call ID provided");
      
      const [callRes, transcriptRes, recordingRes] = await Promise.all([
        workspaceRequest.get<any>(`/calls/${callId}`),
        workspaceRequest.get<any[]>(`/calls/${callId}/transcript`),
        workspaceRequest.get<{ url: string }>(`/calls/${callId}/recording`),
      ]);
      
      return {
        call: callRes.data,
        transcript: transcriptRes.data,
        recordingUrl: recordingRes.data.url,
      };
    },
    enabled: !!activeWorkspaceId && !!callId,
  });
}
