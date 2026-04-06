import { 
  ConversationVolumeChart, 
  CostBreakdownChart, 
  ResponseLatencyChart, 
  OutcomeDistributionChart, 
  SentimentDistributionChart 
} from "@/components/analytics/AnalyticsCharts";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCampaignDetailQuery, useCampaignAnalyticsQuery, useCampaignMutations } from "@/hooks/api/useCampaigns";
import { CalendarIcon, Loader2, AlertTriangle, Trash2 } from "lucide-react";

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

export function SettingsTab() {
  const { id } = useParams();
  const { data: activeCampaign } = useCampaignDetailQuery(id);
  const { updateCampaign, deleteCampaign } = useCampaignMutations(id);
  const campaignStatus = activeCampaign?.status || "draft";
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: activeCampaign?.name || "",
    goal_description: activeCampaign?.goal_description || "",
  });

  useEffect(() => {
    if (activeCampaign) {
      setFormData({
        name: activeCampaign.name,
        goal_description: activeCampaign.goal_description,
      });
    }
  }, [activeCampaign]);

  const handleSave = () => {
    updateCampaign.mutate(formData, {
      onSuccess: () => toast({ title: "Settings saved", description: "Campaign configuration has been updated." }),
      onError: () => toast({ title: "Save failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure campaign identity and objective.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Q4 Sales Outreach"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Campaign Goal (Generates Agent Instructions)</Label>
            <Textarea 
              id="goal" 
              className="min-h-[120px]"
              value={formData.goal_description} 
              onChange={e => setFormData(p => ({ ...p, goal_description: e.target.value }))}
              placeholder="Describe what the agent should achieve..."
            />
            <p className="text-[10px] text-muted-foreground">
              Note: Changing the goal requires regenerating the agent in the Agents tab.
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateCampaign.isPending || campaignStatus === "live"}>
            {updateCampaign.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {campaignStatus === "live" && (
            <p className="text-xs text-warning flex items-center gap-1 mt-2">
              <AlertTriangle className="h-3 w-3" />
              Pause campaign to edit settings.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Archiving this campaign will stop all active calls and move it to the archive. This action cannot be undone easily.
          </p>
          <Button variant="destructive" size="sm" onClick={() => deleteCampaign.mutate()}>
            Archive Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
