import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Plus, Megaphone, Play, Pause, MoreHorizontal, Copy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { CreateCampaignModal } from "@/components/dialogs/CreateCampaignModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const campaigns = [
  { id: "1", name: "Q1 Outreach", agent: "Sales Bot", status: "live" as const, contacted: 842, total: 1200, successRate: "68%", startDate: "Jan 15, 2026" },
  { id: "2", name: "Product Launch", agent: "Outreach Pro", status: "paused" as const, contacted: 156, total: 500, successRate: "72%", startDate: "Feb 1, 2026" },
  { id: "3", name: "Survey Q1", agent: "Survey Agent", status: "draft" as const, contacted: 0, total: 300, successRate: "—", startDate: "—" },
  { id: "4", name: "Re-engagement", agent: "Sales Bot", status: "completed" as const, contacted: 1100, total: 1100, successRate: "55%", startDate: "Dec 10, 2025" },
];

export default function CampaignsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  // Keyboard shortcut: C to open modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleDuplicate = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({ title: "Campaign duplicated", description: `"Copy of ${name}" saved as Draft.` });
  };

  const columns: Column<typeof campaigns[0]>[] = [
    { key: "name", label: "Campaign", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "agent", label: "Agent", sortable: true, hideOnMobile: true },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "progress", label: "Progress", hideOnMobile: true,
      render: (r) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={(r.contacted / r.total) * 100} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{r.contacted}/{r.total}</span>
        </div>
      ),
    },
    { key: "successRate", label: "Success", sortable: true, hideOnMobile: true },
    {
      key: "actions", label: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status !== "draft" && r.status !== "completed" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
              {r.status === "live" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleDuplicate(r.name, e)}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage outbound calling campaigns</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Campaign
        </Button>
      </div>

      {campaigns.length > 0 ? (
        <DataTable columns={columns} data={campaigns} searchKey="name" searchPlaceholder="Search campaigns..." onRowClick={(r) => navigate(`/campaigns/${r.id}`)} />
      ) : (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Launch your first outbound campaign." actionLabel="Create Campaign" onAction={() => setCreateOpen(true)} />
      )}

      <CreateCampaignModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
