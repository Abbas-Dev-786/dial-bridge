import { useQuery } from "@tanstack/react-query";
import { workspaceRequest } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export interface AnalyticsOverview {
  total_calls: number;
  total_calls_delta_pct: number | null;
  success_rate: number;
  success_rate_delta_pct: number | null;
  total_cost_cents: number;
  total_cost_delta_pct: number | null;
  contacts_called: number;
  avg_duration_seconds: number | null;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  total_contacts: number;
  processed_contacts: number;
  success_count: number;
  cost_cents: number;
  agent_name: string | null;
}

export interface CampaignListItemApi {
  id: string;
  name: string;
  status: string;
  agent_name: string | null;
  contacts_total: number;
  contacts_reached: number;
  calls_successful: number;
  total_spend_cents: number;
}

export interface CallListItem {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  agent_name: string | null;
  campaign_name: string | null;
  status: string;
  duration_seconds: number;
  created_at: string;
}

export function mapCampaignListItemToDashboardCampaign(campaign: CampaignListItemApi): Campaign {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    total_contacts: campaign.contacts_total,
    processed_contacts: campaign.contacts_reached,
    success_count: campaign.calls_successful,
    cost_cents: campaign.total_spend_cents,
    agent_name: campaign.agent_name,
  };
}

export function useDashboardQueries() {
  const { activeWorkspaceId } = useWorkspaceStore();

  return useQuery({
    queryKey: ["dashboard", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) throw new Error("No active workspace selected");
      const [analyticsRes, campaignsRes, callsRes] = await Promise.all([
        workspaceRequest.get<{ overview: AnalyticsOverview }>("/analytics"),
        workspaceRequest.get<CampaignListItemApi[]>("/campaigns?status=live&status=paused"),
        workspaceRequest.get<{ items: CallListItem[] }>("/calls", { params: { page_size: 6 } })
      ]);
      return {
        analytics: analyticsRes.data.overview,
        activeCampaigns: campaignsRes.data.map(mapCampaignListItemToDashboardCampaign),
        recentCalls: callsRes.data.items,
      };
    },
    enabled: !!activeWorkspaceId,
  });
}
