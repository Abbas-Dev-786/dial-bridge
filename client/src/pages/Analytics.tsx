import { useState } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { PhoneCall, TrendingUp, Clock, DollarSign, Zap, Timer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ConversationVolumeChart, 
  CostBreakdownChart, 
  ResponseLatencyChart, 
  OutcomeDistributionChart, 
  SentimentDistributionChart 
} from "@/components/analytics/AnalyticsCharts";

const campaigns = [
  { id: "all", name: "All Campaigns" },
  { id: "1", name: "Q1 Outreach" },
  { id: "2", name: "Product Launch" },
  { id: "3", name: "Survey Q1" },
  { id: "4", name: "Re-engagement" },
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7d");
  const [campaignFilter, setCampaignFilter] = useState("all");

  const selectedCampaignName = campaigns.find(c => c.id === campaignFilter)?.name || "All Campaigns";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {campaignFilter === "all"
              ? "Showing metrics across all campaigns"
              : `Showing metrics for ${selectedCampaignName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total Conversations" value="1,250" trend={{ value: "18%", positive: true }} icon={<PhoneCall className="h-4 w-4" />} />
        <StatCard label="Success Rate" value="92.4%" trend={{ value: "1.2%", positive: true }} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg Duration" value="2:48" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Avg Latency (p50)" value="168ms" trend={{ value: "12ms", positive: true }} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Total Cost" value="$415" trend={{ value: "8%", positive: false }} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Avg Turn Time" value="1.2s" icon={<Timer className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ConversationVolumeChart />
        <CostBreakdownChart />
        <ResponseLatencyChart />
        <OutcomeDistributionChart />
        <SentimentDistributionChart />
      </div>
    </div>
  );
}
