import { useNavigate } from "react-router-dom";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_CALLS } from "@/lib/mockData";

export function CallsTab() {
  const navigate = useNavigate();

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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Call Logs</h2>
        <p className="text-sm text-muted-foreground">{CAMPAIGN_CALLS.length} calls in this campaign</p>
      </div>
      <DataTable columns={callColumns} data={CAMPAIGN_CALLS} searchKey="contactName" searchPlaceholder="Search calls..." onRowClick={(r: any) => navigate(`/calls/${r.id}`)} />
    </div>
  );
}
