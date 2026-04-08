import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { ActiveCampaignsGrid } from "@/components/dashboard/ActiveCampaignsGrid";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { useDashboardQueries, AnalyticsOverview, Campaign, CallListItem } from "@/hooks/api/useDashboard";

const conversationColumns: Column<CallListItem>[] = [
  {
    key: "contact_phone",
    label: "Contact",
    sortable: true,
    render: (r) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">{r.contact_name || "Unknown"}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{r.contact_phone}</span>
      </div>
    ),
  },
  { key: "agent_name", label: "Agent", sortable: true, hideOnMobile: true },
  {
    key: "campaign_name",
    label: "Campaign",
    sortable: true,
    hideOnMobile: true,
    render: (r) => (
      <Badge variant="secondary" className="text-[10px] font-normal border-none bg-muted/50">
        {r.campaign_name || "Direct Call"}
      </Badge>
    ),
  },
  {
    key: "duration_seconds",
    label: "Duration",
    sortable: true,
    hideOnMobile: true,
    render: (r) => <span className="font-mono text-xs">{Math.floor(r.duration_seconds / 60)}m {r.duration_seconds % 60}s</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (r) => <StatusBadge status={r.status} />,
  },
  { 
    key: "created_at", 
    label: "Time", 
    sortable: true, 
    hideOnMobile: true,
    render: (r) => <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboardQueries();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (isError || !data) {
    return <DashboardEmptyState />;
  }

  const { analytics, activeCampaigns, recentCalls } = data;

  const isEmpty = (!analytics || analytics.total_calls === 0) && activeCampaigns.length === 0;

  if (isEmpty) {
    return <DashboardEmptyState />;
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner activeCount={activeCampaigns.length} />

      <ActiveCampaignsGrid campaigns={activeCampaigns} />

      {/* ── Aggregated KPIs ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls"
          value={analytics?.total_calls.toLocaleString() || "0"}
          trend={(analytics?.total_calls_delta_pct !== null && analytics?.total_calls_delta_pct !== undefined) ? { 
            value: `${Math.abs(analytics.total_calls_delta_pct).toFixed(1)}%`, 
            positive: analytics.total_calls_delta_pct >= 0 
          } : undefined}
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <StatCard
          label="Success Rate"
          value={`${(analytics?.success_rate || 0).toFixed(1)}%`}
          trend={(analytics?.success_rate_delta_pct !== null && analytics?.success_rate_delta_pct !== undefined) ? { 
            value: `${Math.abs(analytics.success_rate_delta_pct).toFixed(1)}%`, 
            positive: analytics.success_rate_delta_pct >= 0 
          } : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Minutes Used"
          value={Math.round((analytics?.total_calls || 0) * (analytics?.avg_duration_seconds || 0) / 60).toLocaleString()}
          icon={<Clock className="h-4 w-4" />}
        >
          <div className="mt-3">
             <div className="flex justify-between text-[10px] text-muted-foreground mr-1 mb-1">
                <span>Usage</span>
                <span>{analytics?.contacts_called.toLocaleString() || "0"} contacts</span>
             </div>
             <Progress value={Math.min((analytics?.contacts_called || 0) / 5000 * 100, 100)} className="h-1.5" />
          </div>
        </StatCard>
        <StatCard
          label="Total Cost"
          value={`$${((analytics?.total_cost_cents || 0) / 100).toFixed(2)}`}
          trend={(analytics?.total_cost_delta_pct !== null && analytics?.total_cost_delta_pct !== undefined) ? { 
            value: `${Math.abs(analytics.total_cost_delta_pct).toFixed(1)}%`, 
            positive: analytics.total_cost_delta_pct < 0 
          } : undefined}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* ── Recent Conversations + Quick Stats ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Recent Conversations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/calls")}
              className="text-muted-foreground text-xs hover:bg-transparent hover:text-foreground p-0 h-auto"
            >
              View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <DataTable
            columns={conversationColumns}
            data={recentCalls}
            searchKey="contact_phone"
            searchPlaceholder="Search calls..."
          />
        </div>

        <QuickStats 
          recentCalls={recentCalls} 
          campaigns={activeCampaigns} 
        />
      </div>
    </div>
  );
}
