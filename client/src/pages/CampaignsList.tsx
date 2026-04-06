import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCampaignsQuery } from "@/hooks/api/useCampaigns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KBSyncBadge } from "@/components/shared/KBSyncBadge";
import { Progress } from "@/components/ui/progress";
import { Plus, Megaphone, Play, Pause, MoreHorizontal, Copy, Loader2, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { CreateCampaignModal } from "@/components/dialogs/CreateCampaignModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface CampaignListItem {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "live" | "paused" | "completed" | "archived";
  agent_name: string | null;
  agent_was_generated: boolean;
  agent_generation_failed: boolean;
  contacts_total: number;
  contacts_called: number;
  calls_successful: number;
  total_spend_cents: number;
  kb_sync_status: "pending" | "syncing" | "synced" | "failed";
  created_at: string;
}

export function CampaignsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = searchParams.get("status");

  const { data: campaigns = [], isLoading, isError, error, refetch } = useCampaignsQuery({
    status: statusFilter ? statusFilter.split(",") : undefined
  });

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

  const columns: Column<CampaignListItem>[] = useMemo(() => [
    { 
      key: "name", 
      label: "Campaign", 
      sortable: true, 
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{r.name}</span>
          <span className="text-[10px] text-muted-foreground">Created {new Date(r.created_at).toLocaleDateString()}</span>
        </div>
      ) 
    },
    { 
      key: "agent", 
      label: "Agent", 
      sortable: true, 
      hideOnMobile: true,
      render: (r) => {
        if (r.agent_name) return <span className="text-sm font-medium">{r.agent_name}</span>;
        if (r.agent_generation_failed) return <span className="text-xs text-destructive italic flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Generation failed</span>;
        return <span className="text-sm text-muted-foreground italic">Generation pending...</span>;
      }
    },
    { 
      key: "status", 
      label: "Status", 
      render: (r) => <StatusBadge status={r.status} /> 
    },
    {
      key: "kb_sync",
      label: "KB Sync",
      hideOnMobile: true,
      render: (r) => <KBSyncBadge status={r.kb_sync_status} />
    },
    {
      key: "progress", label: "Progress", hideOnMobile: true,
      render: (r) => {
        const progress = r.contacts_total > 0 ? (r.contacts_called / r.contacts_total) * 100 : 0;
        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {r.contacts_called} / {r.contacts_total}
              </span>
              <span className="text-[10px] font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-1 flex-1" />
          </div>
        );
      },
    },
    { 
      key: "successRate", 
      label: "Success", 
      sortable: true, 
      hideOnMobile: true,
      render: (r) => {
        if (r.contacts_called === 0) return <span className="text-muted-foreground">—</span>;
        const rate = (r.calls_successful / r.contacts_called) * 100;
        return <span className="font-medium">{rate.toFixed(0)}%</span>;
      }
    },
    {
      key: "spend",
      label: "Spend",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-sm">
          {(r.total_spend_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </span>
      )
    },
    {
      key: "actions", label: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status !== "draft" && r.status !== "completed" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
              e.stopPropagation();
              // In the future: handle pause/play API
            }}>
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
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate (TBD)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Fetching your campaigns...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Failed to load campaigns</h3>
          <p className="text-sm text-muted-foreground">{(error as any)?.response?.data?.detail || "An unexpected error occurred."}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

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
        <DataTable 
          columns={columns} 
          data={campaigns} 
          searchKey="name" 
          searchPlaceholder="Search campaigns..." 
          onRowClick={(r) => navigate(`/campaigns/${r.id}`)} 
        />
      ) : (
        <EmptyState 
          icon={Megaphone} 
          title="No campaigns yet" 
          description="Launch your first outbound campaign." 
          actionLabel="Create Campaign" 
          onAction={() => setCreateOpen(true)} 
        />
      )}

      <CreateCampaignModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
