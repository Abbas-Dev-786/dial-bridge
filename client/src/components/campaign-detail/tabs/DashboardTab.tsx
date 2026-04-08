import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle, XCircle, ArrowRight, TrendingUp, PhoneCall, LoaderCircle } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useCampaignDetailQuery, useCampaignCallsQuery } from "@/hooks/api/useCampaigns";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardTab() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { setActiveTab } = useCampaignStore();
  const { data: activeCampaign } = useCampaignDetailQuery(id);
  const { data: callsData } = useCampaignCallsQuery(id, { page_size: 5 });
  const recentCalls = callsData?.items || [];

  const stats = {
    reached: activeCampaign?.contacts_reached || 0,
    totalContacts: activeCampaign?.contacts_total || 0,
    pending: activeCampaign?.contacts_pending || 0,
    inProgress: activeCampaign?.contacts_calling || 0,
    failed: activeCampaign?.calls_failed || 0,
    completed: activeCampaign?.contacts_called || 0,
  };

  const callColumns: Column<any>[] = [
    { key: "contact_name", label: "Name", render: (r) => <span className="font-medium">{r.contact_name || "Unknown"}</span> },
    { key: "contact_phone", label: "Number", hideOnMobile: true, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.contact_phone || "—"}</span> },
    { key: "agent_name", label: "Agent", hideOnMobile: true, render: (r) => <span className="text-xs">{r.agent_name || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "duration_seconds", label: "Duration", hideOnMobile: true, render: (r) => <span className="font-mono text-sm">{r.duration_seconds ?? 0}s</span> },
    { key: "outcome", label: "Outcome", hideOnMobile: true, render: (r) => <Badge variant="secondary" className="text-xs font-normal">{r.outcome || "None"}</Badge> },
    { key: "total_cost_cents", label: "Cost", hideOnMobile: true, render: (r) => <span className="font-mono text-xs">${((r.total_cost_cents || 0) / 100).toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Reached</p>
              <p className="text-xl font-bold">{stats.reached.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalContacts.toLocaleString()}</span></p>
            </div>
          </div>
          <Progress value={stats.totalContacts > 0 ? (stats.reached / stats.totalContacts) * 100 : 0} className="mt-3 h-1.5" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><CheckCircle className="h-4 w-4 text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent p-2"><LoaderCircle className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-xl font-bold">{stats.inProgress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><XCircle className="h-4 w-4 text-destructive" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-xl font-bold">{stats.failed}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OutcomeBreakdown />
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Campaign Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: "Agent", value: activeCampaign?.agent_name || "None", click: "agents" },
              { label: "Phone Number", value: activeCampaign?.phone_number || "None", click: "phones" },
              { label: "Contacts", value: `${stats.totalContacts} total`, click: "contacts" },
              { label: "Pending", value: `${stats.pending} to call`, click: "contacts" },
              { label: "Completed", value: `${stats.completed} finished`, click: "contacts" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.click)}
                className="flex items-center justify-between py-2 w-full text-left hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  {item.value} <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <CostSummary />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Calls</h2>
          <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setActiveTab("calls")}>
            View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        <DataTable columns={callColumns} data={recentCalls} onRowClick={(r: any) => navigate(`/calls/${r.id}`)} />
      </div>
    </div>
  );
}

function OutcomeBreakdown() {
  const outcomes = [
    { label: "Booked Demo", count: 285, pct: 34, icon: CheckCircle, color: "text-success" },
    { label: "Interested", count: 189, pct: 22, icon: TrendingUp, color: "text-primary" },
    { label: "Not Interested", count: 168, pct: 20, icon: XCircle, color: "text-warning" },
    { label: "No Answer", count: 142, pct: 17, icon: PhoneCall, color: "text-muted-foreground" },
    { label: "Voicemail", count: 58, pct: 7, icon: PhoneCall, color: "text-muted-foreground" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Outcome Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {outcomes.map((o) => (
          <div key={o.label} className="flex items-center gap-3 py-1.5">
            <o.icon className={cn("h-4 w-4 shrink-0", o.color)} />
            <span className="text-sm flex-1">{o.label}</span>
            <span className="text-sm font-semibold tabular-nums">{o.count}</span>
            <div className="w-14"><Progress value={o.pct} className="h-1.5" /></div>
            <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">{o.pct}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CostSummary() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <InfoRow label="Total Spend" value="$127.40" mono />
        <InfoRow label="Avg Cost/Call" value="$0.15" mono />
        <InfoRow label="Telephony" value="$42.80" mono />
        <InfoRow label="AI / LLM" value="$68.20" mono />
        <InfoRow label="TTS / STT" value="$16.40" mono />
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm font-semibold">Projected Total</span>
          <span className="text-sm font-mono font-bold text-primary">$181.70</span>
        </div>
      </CardContent>
    </Card>
  );
}

const InfoRow = forwardRef<HTMLDivElement, { label: string; value: string; mono?: boolean }>(
  ({ label, value, mono }, ref) => (
    <div ref={ref} className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", mono && "font-mono")}>{value}</span>
    </div>
  )
);
InfoRow.displayName = "InfoRow";
