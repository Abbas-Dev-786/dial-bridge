import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle, XCircle, DollarSign, ArrowRight, TrendingUp, PhoneCall } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCampaignStore } from "@/store/useCampaignStore";
import { CAMPAIGN_CALLS, KNOWLEDGE_DOCS } from "@/lib/mockData";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DashboardTab() {
  const navigate = useNavigate();
  const { setActiveTab, contacts, integrationToggles } = useCampaignStore();

  const callColumns: Column<typeof CAMPAIGN_CALLS[0]>[] = [
    { key: "contactName", label: "Name", render: (r) => <span className="font-medium">{r.contactName}</span> },
    { key: "contact", label: "Number", hideOnMobile: true, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.contact}</span> },
    { key: "agent", label: "Agent", hideOnMobile: true, render: (r) => <span className="text-xs">{r.agent}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "duration", label: "Duration", hideOnMobile: true, render: (r) => <span className="font-mono text-sm">{r.duration}</span> },
    { key: "outcome", label: "Outcome", hideOnMobile: true, render: (r) => <Badge variant="secondary" className="text-xs font-normal">{r.outcome}</Badge> },
    { key: "cost", label: "Cost", hideOnMobile: true, render: (r) => <span className="font-mono text-xs">{r.cost}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Contacted</p>
              <p className="text-xl font-bold">842 <span className="text-xs font-normal text-muted-foreground">/ 1,200</span></p>
            </div>
          </div>
          <Progress value={70} className="mt-3 h-1.5" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><CheckCircle className="h-4 w-4 text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold">68%</p>
                <span className="text-xs font-medium text-success">↑ 3%</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><XCircle className="h-4 w-4 text-destructive" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-xl font-bold">58</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent p-2"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spend</p>
              <p className="text-xl font-bold font-mono">$127.40</p>
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
              { label: "Agent", value: "Sales Bot Pro", click: "agents" },
              { label: "Phone Number", value: "+1 (555) 100-2000", click: "phones" },
              { label: "Knowledge Docs", value: `${KNOWLEDGE_DOCS.length}`, click: "knowledge" },
              { label: "Integrations", value: `${Object.values(integrationToggles).filter(Boolean).length} active`, click: "integrations" },
              { label: "Contacts", value: `${contacts.length} / 1200`, click: "contacts" },
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
        <DataTable columns={callColumns} data={CAMPAIGN_CALLS.slice(0, 5)} onRowClick={(r: any) => navigate(`/calls/${r.id}`)} />
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
