import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  VOLUME_DATA,
  COST_DATA,
  LATENCY_DATA,
  OUTCOME_DATA,
  SENTIMENT_DATA,
} from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, AlertTriangle, Trash2 } from "lucide-react";

const tooltipStyle = {
  backgroundColor: "hsl(0 0% 100%)",
  border: "1px solid hsl(30 15% 90%)",
  borderRadius: "8px",
};
const axisTick = { fill: "hsl(220 10% 46%)" };

export function AnalyticsTab() {
  const { id } = useParams();
  const { fetchAnalytics, analytics, isLoading } = useCampaignStore();
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    if (id) {
      fetchAnalytics(id);
    }
  }, [id, fetchAnalytics]);

  const handleRefresh = () => {
    if (id) fetchAnalytics(id, dateRange.from, dateRange.to);
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Conversation Volume
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VOLUME_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis className="text-xs" tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="success"
                  stackId="1"
                  stroke="hsl(152 69% 40%)"
                  fill="hsl(152 69% 40% / 0.2)"
                  name="Successful"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="1"
                  stroke="hsl(0 72% 51%)"
                  fill="hsl(0 72% 51% / 0.2)"
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Telephony Latency
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LATENCY_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis
                  className="text-xs"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke="hsl(152 69% 40%)"
                  strokeWidth={2}
                  name="p50"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  name="p95"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Cost Distribution
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COST_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis
                  className="text-xs"
                  tick={axisTick}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="telephony"
                  fill="hsl(220 10% 46% / 0.5)"
                  radius={[4, 4, 0, 0]}
                  name="Telephony"
                />
                <Bar
                  dataKey="ai"
                  fill="hsl(15 90% 55%)"
                  radius={[4, 4, 0, 0]}
                  name="LLM"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Sentiment Breakdown
          </h3>
          <div className="h-[260px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SENTIMENT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {SENTIMENT_DATA.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SettingsTab() {
  const { id } = useParams();
  const { activeCampaign, updateCampaign, campaignStatus } = useCampaignStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: activeCampaign?.name || "",
    goal_description: activeCampaign?.goal_description || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeCampaign) {
      setFormData({
        name: activeCampaign.name,
        goal_description: activeCampaign.goal_description,
      });
    }
  }, [activeCampaign]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateCampaign(id, formData);
      toast({ title: "Settings saved", description: "Campaign configuration has been updated." });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
          <Button onClick={handleSave} disabled={isSaving || campaignStatus === "live"}>
            {isSaving ? "Saving..." : "Save Changes"}
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
          <Button variant="destructive" size="sm">
            Archive Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
