import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Download } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";

const calls = [
  { id: "1", contact: "+1 (555) 123-4567", agent: "Sales Bot Pro", campaign: "Q1 Outreach", direction: "Outbound", duration: "3:42", status: "live" as const, cost: "$0.12", time: "2 min ago" },
  { id: "2", contact: "+1 (555) 987-6543", agent: "Support AI", campaign: "Product Launch", direction: "Inbound", duration: "1:15", status: "live" as const, cost: "$0.04", time: "5 min ago" },
  { id: "3", contact: "+1 (555) 456-7890", agent: "Follow-up Agent", campaign: "Q1 Outreach", direction: "Outbound", duration: "5:08", status: "live" as const, cost: "$0.18", time: "12 min ago" },
  { id: "4", contact: "+1 (555) 321-0987", agent: "Sales Bot Pro", campaign: "Q1 Outreach", direction: "Outbound", duration: "0:45", status: "error" as const, cost: "$0.02", time: "18 min ago" },
  { id: "5", contact: "+1 (555) 654-3210", agent: "Survey Agent", campaign: "Survey Q1", direction: "Outbound", duration: "2:33", status: "live" as const, cost: "$0.09", time: "25 min ago" },
  { id: "6", contact: "+1 (555) 789-0123", agent: "Support AI", campaign: "Product Launch", direction: "Inbound", duration: "4:12", status: "live" as const, cost: "$0.15", time: "30 min ago" },
];

const columns: Column<typeof calls[0]>[] = [
  { key: "contact", label: "Contact", sortable: true, render: (r) => <span className="font-mono text-sm">{r.contact}</span> },
  { key: "agent", label: "Agent", sortable: true, hideOnMobile: true },
  { key: "campaign", label: "Campaign", hideOnMobile: true, render: (r) => <Badge variant="secondary" className="text-xs font-normal">{r.campaign}</Badge> },
  { key: "direction", label: "Direction", hideOnMobile: true },
  { key: "duration", label: "Duration", sortable: true, hideOnMobile: true, render: (r) => <span className="font-mono text-sm">{r.duration}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "cost", label: "Cost", sortable: true, hideOnMobile: true },
  { key: "time", label: "Time", sortable: true, hideOnMobile: true },
];

export default function CallLogs() {
  const navigate = useNavigate();
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
          <p className="text-sm text-muted-foreground">All ElevenLabs conversation records. Click to view transcripts, costs, and evaluations.</p>
        </div>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      {calls.length > 0 ? (
        <DataTable columns={columns} data={calls} searchKey="contact" searchPlaceholder="Search calls..." onRowClick={(r) => navigate(`/calls/${r.id}`)} />
      ) : (
        <EmptyState icon={PhoneCall} title="No calls yet" description="Call logs will appear here once your campaigns start making calls." />
      )}

      <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} title="Export Call Logs" description="Download call records in your preferred format." />
    </div>
  );
}
