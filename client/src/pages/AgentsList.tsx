import { useNavigate } from "react-router-dom";

import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAgentsQuery } from "@/hooks/api/useAgents";
import { Button } from "@/components/ui/button";

interface AgentListItem {
  id: string;
  name: string;
  status: "draft" | "live" | "paused" | "archived";
  llm_model: string;
  success_rate: number | null;
  active_campaign_id: string | null;
  active_campaign_name: string | null;
  assigned_campaign_id: string | null;
  assigned_campaign_name: string | null;
  assigned_campaign_status: "draft" | "scheduled" | "live" | "paused" | "completed" | "archived" | null;
  created_at: string;
}

export default function AgentsList() {
  const navigate = useNavigate();

  const { data: agents = [], isLoading, isError, error, refetch } = useAgentsQuery();

  const columns: Column<AgentListItem>[] = [
    { 
      key: "name", 
      label: "Agent Name", 
      sortable: true, 
      render: (r) => <span className="font-medium">{r.name}</span> 
    },
    { 
      key: "llm_model", 
      label: "Model", 
      sortable: true, 
      hideOnMobile: true, 
      render: (r) => (
        <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-tight">
          {r.llm_model}
        </Badge>
      )
    },
    { 
      key: "status", 
      label: "Status", 
      render: (r) => <StatusBadge status={r.status} /> 
    },
    { 
      key: "assignment", 
      label: "Assignment", 
      hideOnMobile: true, 
      render: (r) => {
        const isActiveAssignment =
          r.assigned_campaign_status === "live" || r.assigned_campaign_status === "scheduled";

        if (!r.assigned_campaign_name) {
          return <span className="text-xs text-muted-foreground italic">Available</span>;
        }

        return (
          <Badge
            variant="outline"
            className={
              isActiveAssignment
                ? "text-[10px] font-medium bg-primary/5 text-primary border-primary/20"
                : "text-[10px] font-medium bg-background text-foreground border-border"
            }
          >
            {r.assigned_campaign_name}
          </Badge>
        );
      }
    },
    { 
      key: "success_rate", 
      label: "Success", 
      sortable: true, 
      hideOnMobile: true, 
      render: (r) => (
        <span className="text-sm font-medium">
          {r.success_rate !== null ? `${Math.round(r.success_rate)}%` : "—"}
        </span>
      )
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Fetching your agents...</p>
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
          <h3 className="text-lg font-semibold tracking-tight">Failed to load agents</h3>
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
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your AI calling agents. Agents are generated from campaign goals.
          </p>
        </div>
      </div>

      {agents.length > 0 ? (
        <DataTable
          columns={columns}
          data={agents}
          searchKey="name"
          searchPlaceholder="Search agents..."
          onRowClick={(row) => navigate(`/agents/${row.id}`)}
        />
      ) : (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Agents are automatically generated when you create a new campaign."
          actionLabel="Create Campaign"
          onAction={() => navigate("/campaigns")}
        />
      )}
    </div>
  );
}
