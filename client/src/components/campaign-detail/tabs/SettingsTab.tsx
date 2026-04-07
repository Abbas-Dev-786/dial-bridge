import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { 
  useCampaignDetailQuery, 
  useCampaignMutations 
} from "@/hooks/api/useCampaigns";
import { 
  Loader2, AlertTriangle, Trash2, Calendar, 
  Clock, Globe, Zap, Settings2, ShieldCheck, 
  RotateCcw, PhoneCall, Info
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TIMEZONES = [
  "UTC",
  "US/Eastern",
  "US/Central",
  "US/Mountain",
  "US/Pacific",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RETRY_OUTCOMES = [
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "voicemail", label: "Voicemail" },
  { value: "failed", label: "Failed" },
  { value: "timeout", label: "Timeout" },
];

export function SettingsTab() {
  const { id } = useParams();
  const { data: campaign, isLoading } = useCampaignDetailQuery(id);
  const { updateCampaign, deleteCampaign } = useCampaignMutations(id);
  const { toast } = useToast();

  const [formData, setFormData] = useState<any>({
    name: "",
    goal_description: "",
    caller_id_display_name: "",
    timezone: "US/Eastern",
    schedule_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    schedule_start_time: "09:00",
    schedule_end_time: "17:00",
    start_date: null,
    end_date: null,
    max_concurrency: 5,
    max_retries: 3,
    retry_delay_minutes: 30,
    retry_on_outcomes: ["no_answer", "busy", "voicemail"],
    dnc_check_enabled: true,
    record_calls: true,
    tcpa_mode: true,
    voicemail_detection: true,
    leave_voicemail: false,
  });

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || "",
        goal_description: campaign.goal_description || "",
        caller_id_display_name: campaign.caller_id_display_name || "",
        timezone: campaign.timezone || "US/Eastern",
        schedule_days: campaign.schedule_days || ["Mon", "Tue", "Wed", "Thu", "Fri"],
        schedule_start_time: campaign.schedule_start_time || "09:00",
        schedule_end_time: campaign.schedule_end_time || "17:00",
        start_date: campaign.start_date || null,
        end_date: campaign.end_date || null,
        max_concurrency: campaign.max_concurrency || 5,
        max_retries: campaign.max_retries || 3,
        retry_delay_minutes: campaign.retry_delay_minutes || 30,
        retry_on_outcomes: campaign.retry_on_outcomes || ["no_answer", "busy", "voicemail"],
        dnc_check_enabled: campaign.dnc_check_enabled ?? true,
        record_calls: campaign.record_calls ?? true,
        tcpa_mode: campaign.tcpa_mode ?? true,
        voicemail_detection: campaign.voicemail_detection ?? true,
        leave_voicemail: campaign.leave_voicemail ?? false,
      });
    }
  }, [campaign]);

  const handleSave = () => {
    updateCampaign.mutate(formData, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Campaign configuration has been updated successfully.",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: error.response?.data?.detail || "An error occurred while saving settings.",
        });
      },
    });
  };

  const isLive = campaign?.status === "live";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Settings</h2>
          <p className="text-muted-foreground">Manage scheduling, compliance, and agent behavior.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateCampaign.isPending || isLive}
          size="lg"
          className="min-w-[140px]"
        >
          {updateCampaign.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {isLive && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 flex gap-3 items-center text-yellow-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Campaign is currently LIVE. Please pause the campaign to modify its configuration.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section: General Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>General Identity</CardTitle>
                <CardDescription>Basic campaign information and AI objectives.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Q4 Sales Outreach"
                  disabled={isLive}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callerId">Caller ID Name (CNAM)</Label>
                <Input 
                  id="callerId" 
                  value={formData.caller_id_display_name} 
                  onChange={e => setFormData({ ...formData, caller_id_display_name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  disabled={isLive}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Campaign Goal & Instructions</Label>
              <Textarea 
                id="goal" 
                className="min-h-[120px] resize-none"
                value={formData.goal_description} 
                onChange={e => setFormData({ ...formData, goal_description: e.target.value })}
                placeholder="Describe what the agent should achieve..."
                disabled={isLive}
              />
              <div className="flex gap-1.5 items-start mt-1.5 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground italic">
                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                Changing the goal will update the base personality of your agents.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Scheduling */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Scheduling</CardTitle>
                <CardDescription>When calls should be initiated.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="h-3 w-3" /> Timezone
              </Label>
              <Select 
                value={formData.timezone} 
                onValueChange={v => setFormData({ ...formData, timezone: v })}
                disabled={isLive}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Active Days</Label>
              <ToggleGroup 
                type="multiple" 
                value={formData.schedule_days} 
                onValueChange={v => v?.length > 0 && setFormData({ ...formData, schedule_days: v })}
                className="justify-start flex-wrap gap-2"
                disabled={isLive}
              >
                {DAYS_OF_WEEK.map(day => (
                  <ToggleGroupItem 
                    key={day} 
                    value={day} 
                    className="h-8 w-11 p-0 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {day}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Start Time</Label>
                <Input 
                  type="time" 
                  value={formData.schedule_start_time} 
                  onChange={e => setFormData({ ...formData, schedule_start_time: e.target.value })}
                  disabled={isLive}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Time</Label>
                <Input 
                  type="time" 
                  value={formData.schedule_end_time} 
                  onChange={e => setFormData({ ...formData, schedule_end_time: e.target.value })}
                  disabled={isLive}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Start Date
                </Label>
                <Input 
                  type="date" 
                  value={formData.start_date || ""} 
                  onChange={e => setFormData({ ...formData, start_date: e.target.value || null })}
                  disabled={isLive}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                   <Calendar className="h-3 w-3" /> End Date
                </Label>
                <Input 
                  type="date" 
                  value={formData.end_date || ""} 
                  onChange={e => setFormData({ ...formData, end_date: e.target.value || null })}
                  disabled={isLive}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Call Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-500">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Call Execution</CardTitle>
                <CardDescription>Concurrency and execution logic.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Max Concurrent Calls</span>
                <Badge variant="outline">{formData.max_concurrency}</Badge>
              </Label>
              <Input 
                type="number" 
                min={1} 
                max={100}
                value={formData.max_concurrency} 
                onChange={e => setFormData({ ...formData, max_concurrency: parseInt(e.target.value) })}
                disabled={isLive}
              />
              <p className="text-[10px] text-muted-foreground">Number of simultaneous outbound calls.</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Record Calls</Label>
                  <p className="text-xs text-muted-foreground">Store audio for quality review.</p>
                </div>
                <Switch 
                  checked={formData.record_calls} 
                  onCheckedChange={v => setFormData({ ...formData, record_calls: v })}
                  disabled={isLive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Answering Machine Detection</Label>
                  <p className="text-xs text-muted-foreground">Don't talk to machines.</p>
                </div>
                <Switch 
                  checked={formData.voicemail_detection} 
                  onCheckedChange={v => setFormData({ ...formData, voicemail_detection: v })}
                  disabled={isLive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Leave Voicemail Drops</Label>
                  <p className="text-xs text-muted-foreground">Drop AI message if machine detected.</p>
                </div>
                <Switch 
                  checked={formData.leave_voicemail} 
                  onCheckedChange={v => setFormData({ ...formData, leave_voicemail: v })}
                  disabled={isLive}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Retries & Outcomes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Retry Logic</CardTitle>
                <CardDescription>How to handle failed attempts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Max Retries</Label>
                <Input 
                  type="number" 
                  min={0} 
                  max={10}
                  value={formData.max_retries} 
                  onChange={e => setFormData({ ...formData, max_retries: parseInt(e.target.value) })}
                  disabled={isLive}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Retry Delay (min)</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={formData.retry_delay_minutes} 
                  onChange={e => setFormData({ ...formData, retry_delay_minutes: parseInt(e.target.value) })}
                  disabled={isLive}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Retry on Outcomes</Label>
              <div className="grid grid-cols-2 gap-y-3">
                {RETRY_OUTCOMES.map(outcome => (
                  <div key={outcome.value} className="flex items-center gap-2">
                    <Checkbox 
                      id={`retry-${outcome.value}`}
                      checked={formData.retry_on_outcomes.includes(outcome.value)}
                      onCheckedChange={(checked) => {
                        const current = [...formData.retry_on_outcomes];
                        if (checked) {
                          setFormData({ ...formData, retry_on_outcomes: [...current, outcome.value] });
                        } else {
                          setFormData({ ...formData, retry_on_outcomes: current.filter(v => v !== outcome.value) });
                        }
                      }}
                      disabled={isLive}
                    />
                    <label 
                      htmlFor={`retry-${outcome.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                    >
                      {outcome.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Compliance */}
        <Card>
           <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-green-500/10 text-green-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Compliance</CardTitle>
                <CardDescription>Regulatory and safety settings.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>DNC Suppression</Label>
                <p className="text-xs text-muted-foreground">Check against Do Not Call lists.</p>
              </div>
              <Switch 
                checked={formData.dnc_check_enabled} 
                onCheckedChange={v => setFormData({ ...formData, dnc_check_enabled: v })}
                disabled={isLive}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>TCPA Mode</Label>
                <p className="text-xs text-muted-foreground">Strict compliance for US calls.</p>
              </div>
              <Switch 
                checked={formData.tcpa_mode} 
                onCheckedChange={v => setFormData({ ...formData, tcpa_mode: v })}
                disabled={isLive}
              />
            </div>

            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex gap-3 text-emerald-800">
              <Zap className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <p className="text-xs leading-relaxed">
                TCPA Mode adds required delays and opt-out recognition patterns to ensure your campaign follows federal guidelines.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/20 bg-destructive/5 mt-12">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold text-sm">Delete Campaign</p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete the campaign, all contacts, and call history. This action cannot be undone.
            </p>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              if (confirm("Are you sure you want to delete this campaign? This cannot be undone.")) {
                deleteCampaign.mutate();
              }
            }}
          >
            Delete Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
