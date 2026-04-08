import { useNavigate, useParams } from "react-router-dom";
import { useCampaignCallsQuery } from "@/hooks/api/useCampaigns";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

export function CallsTab() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { data: callsData, isLoading } = useCampaignCallsQuery(id);
  const calls = callsData?.items || [];

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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Call Logs</h2>
        <p className="text-sm text-muted-foreground">{calls.length} calls in this campaign</p>
      </div>
      <DataTable 
        columns={callColumns} 
        data={calls} 
        searchKey="contact_name" 
        searchPlaceholder="Search calls..." 
        onRowClick={(r: any) => navigate(`/calls/${r.id}`)} 
      />
    </div>
  );
}
