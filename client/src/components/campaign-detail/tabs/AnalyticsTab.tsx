import { 
  ConversationVolumeChart, 
  CostBreakdownChart, 
  ResponseLatencyChart, 
  OutcomeDistributionChart, 
  SentimentDistributionChart 
} from "@/components/analytics/AnalyticsCharts";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaignAnalyticsQuery } from "@/hooks/api/useCampaigns";
import { Loader2 } from "lucide-react";

export function AnalyticsTab() {
  const { id } = useParams();
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const queryParams: any = {};
  if (dateRange.from) queryParams.date_from = dateRange.from;
  if (dateRange.to) queryParams.date_to = dateRange.to;

  const { data: analytics, isLoading, refetch } = useCampaignAnalyticsQuery(id, queryParams);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Campaign Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance metrics and conversation insights.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Simple date inputs for now since we don't have a full range picker component ready */}
          <Input 
            type="date" 
            className="h-8 text-xs w-32" 
            value={dateRange.from} 
            onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} 
          />
          <span className="text-muted-foreground">-</span>
          <Input 
            type="date" 
            className="h-8 text-xs w-32" 
            value={dateRange.to} 
            onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} 
          />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Filter"}
          </Button>
        </div>
      </div>

      {analytics && (
        <div className="grid gap-6 md:grid-cols-2">
          <ConversationVolumeChart data={analytics.volume.data} />
          <ResponseLatencyChart data={analytics.latency.data} />
          <CostBreakdownChart data={analytics.cost.data} />
          <OutcomeDistributionChart data={analytics.outcomes} />
          <SentimentDistributionChart data={analytics.sentiment} />
        </div>
      )}

      {isLoading && !analytics && (
        <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="text-sm text-muted-foreground">Fetching campaign analytics...</p>
        </div>
      )}
    </div>
  );
}
