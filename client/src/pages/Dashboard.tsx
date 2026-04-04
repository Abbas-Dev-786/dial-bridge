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
} from "lucide-react";
import { RECENT_CONVERSATIONS } from "@/lib/mockData";
import { useDashboardStore } from "@/store/useDashboardStore";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { OnboardingStepper } from "@/components/dashboard/OnboardingStepper";
import { ActiveCampaignsGrid } from "@/components/dashboard/ActiveCampaignsGrid";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

const conversationColumns: Column<(typeof RECENT_CONVERSATIONS)[0]>[] = [
  {
    key: "contact",
    label: "Contact",
    sortable: true,
    render: (r) => <span className="font-mono text-sm">{r.contact}</span>,
  },
  { key: "agent", label: "Agent", sortable: true, hideOnMobile: true },
  {
    key: "campaign",
    label: "Campaign",
    sortable: true,
    hideOnMobile: true,
    render: (r) => (
      <Badge variant="secondary" className="text-xs font-normal">
        {r.campaign}
      </Badge>
    ),
  },
  {
    key: "duration",
    label: "Duration",
    sortable: true,
    hideOnMobile: true,
    render: (r) => <span className="font-mono text-sm">{r.duration}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (r) => <StatusBadge status={r.status} />,
  },
  { key: "time", label: "Time", sortable: true, hideOnMobile: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasAgents, hasCampaigns } = useDashboardStore();
  const isEmpty = !hasAgents && !hasCampaigns;

  if (isEmpty) {
    return <DashboardEmptyState />;
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      <OnboardingStepper />

      <ActiveCampaignsGrid />

      {/* ── Aggregated KPIs ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls"
          value="1,284"
          trend={{ value: "12%", positive: true }}
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <StatCard
          label="Top Agent Success"
          value="94.2%"
          trend={{ value: "2.1%", positive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Minutes Used"
          value="4,320"
          icon={<Clock className="h-4 w-4" />}
        >
          <Progress value={43} className="mt-3 h-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">
            4,320 / 10,000 min
          </p>
        </StatCard>
        <StatCard
          label="Total Cost"
          value="$180.70"
          trend={{ value: "8%", positive: false }}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* ── Recent Conversations + Quick Stats ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/call-logs")}
              className="text-muted-foreground"
            >
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <DataTable
            columns={conversationColumns}
            data={RECENT_CONVERSATIONS}
            searchKey="contact"
            searchPlaceholder="Search conversations..."
          />
        </div>

        <QuickStats />
      </div>
    </div>
  );
}
