import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { PhoneCall, TrendingUp, Clock, DollarSign, Zap, Timer, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ConversationVolumeChart, 
  CostBreakdownChart, 
  ResponseLatencyChart, 
  OutcomeDistributionChart, 
  SentimentDistributionChart 
} from "@/components/analytics/AnalyticsCharts";
import { formatCentsToDollars, formatSecondsToDuration } from "@/lib/utils";
import { DatePickerWithRange } from "@/components/shared/DateRangePicker";
import { useCampaignsQuery } from "@/hooks/api/useCampaigns";
import { useAnalyticsQuery } from "@/hooks/api/useAnalytics";
import { subDays, startOfMonth, format, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

export default function Analytics() {
  const [dateRangeType, setDateRangeType] = useState("7d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 7),
    to: new Date(),
  }));
  const [campaignFilter, setCampaignFilter] = useState("all");
  // Fetch campaigns for dropdown
  const { data: campaignsData } = useCampaignsQuery();
  const campaigns = campaignsData?.items || [];

  const fetchParams = useMemo(() => {
    let date_from: string;
    let date_to: string = format(new Date(), "yyyy-MM-dd");

    if (dateRangeType === "7d") {
      date_from = format(subDays(new Date(), 6), "yyyy-MM-dd");
    } else if (dateRangeType === "30d") {
      date_from = format(subDays(new Date(), 29), "yyyy-MM-dd");
    } else if (dateRangeType === "month") {
      date_from = format(startOfMonth(new Date()), "yyyy-MM-dd");
    } else if (dateRangeType === "custom" && customRange?.from) {
      date_from = format(customRange.from, "yyyy-MM-dd");
      if (customRange.to) date_to = format(customRange.to, "yyyy-MM-dd");
    } else {
      date_from = format(subDays(new Date(), 6), "yyyy-MM-dd");
    }

    return {
      date_from,
      date_to,
      campaign_id: campaignFilter === "all" ? undefined : campaignFilter
    };
  }, [dateRangeType, customRange, campaignFilter]);

  const { data, isLoading } = useAnalyticsQuery(fetchParams);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overview = data?.overview;
  const selectedCampaignName = campaigns.find(c => c.id === campaignFilter)?.name || "All Campaigns";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground">
            {campaignFilter === "all"
              ? "All campaigns"
              : `Campaign: ${selectedCampaignName}`}
            <span className="mx-2">|</span>
            {data?.date_from} to {data?.date_to}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateRangeType} onValueChange={setDateRangeType}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {dateRangeType === "custom" && (
            <DatePickerWithRange 
              date={customRange} 
              setDate={setCustomRange}
              className="mt-2 sm:mt-0"
            />
          )}
        </div>
      </div>

      {overview && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          <StatCard 
            label="Total Calls" 
            value={overview.total_calls.toLocaleString()} 
            trend={overview.total_calls_delta_pct !== null ? { value: `${Math.abs(overview.total_calls_delta_pct)}%`, positive: overview.total_calls_delta_pct >= 0 } : undefined} 
            icon={<PhoneCall className="h-4 w-4" />} 
          />
          <StatCard 
            label="Success Rate" 
            value={`${overview.success_rate}%`} 
            trend={overview.success_rate_delta_pct !== null ? { value: `${Math.abs(overview.success_rate_delta_pct)}%`, positive: overview.success_rate_delta_pct >= 0 } : undefined} 
            icon={<TrendingUp className="h-4 w-4" />} 
          />
          <StatCard 
            label="Avg Duration" 
            value={formatSecondsToDuration(overview.avg_duration_seconds || 0)} 
            icon={<Clock className="h-4 w-4" />} 
          />
          <StatCard 
            label="Avg Latency (p50)" 
            value={overview.avg_latency_p50_ms ? `${overview.avg_latency_p50_ms}ms` : "N/A"} 
            icon={<Zap className="h-4 w-4" />} 
          />
          <StatCard 
            label="Total Cost" 
            value={formatCentsToDollars(overview.total_cost_cents)} 
            trend={overview.total_cost_delta_pct !== null ? { value: `${Math.abs(overview.total_cost_delta_pct)}%`, positive: overview.total_cost_delta_pct <= 0 } : undefined} 
            icon={<DollarSign className="h-4 w-4" />} 
          />
          <StatCard 
            label="Contacts Called" 
            value={overview.contacts_called.toLocaleString()} 
            icon={<Timer className="h-4 w-4" />} 
          />
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {!isLoading ? (
            <>
              <ConversationVolumeChart data={data.volume.data} />
              <CostBreakdownChart data={data.cost.data} />
              <ResponseLatencyChart data={data.latency.data} />
              <OutcomeDistributionChart data={data.outcomes} />
              <SentimentDistributionChart data={data.sentiment} />
            </>
          ) : (
            <div className="col-span-full py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Refreshing results...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
