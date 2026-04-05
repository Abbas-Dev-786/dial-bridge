import { ChevronRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useNavigate } from "react-router-dom";
import { ACTIVE_CAMPAIGNS } from "@/lib/mockData";
import { useDashboardStore } from "@/store/useDashboardStore";

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_contacts: number;
  processed_contacts: number;
  success_count: number;
  cost_cents: number;
  agent_name: string | null;
}

interface ActiveCampaignsGridProps {
  campaigns: Campaign[];
}

export function ActiveCampaignsGrid({ campaigns }: ActiveCampaignsGridProps) {
  const navigate = useNavigate();

  if (campaigns.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Active Campaigns</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/campaigns")}
          className="text-muted-foreground text-xs hover:bg-transparent"
        >
          View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => {
          const progress = c.total_contacts > 0 ? Math.round((c.processed_contacts / c.total_contacts) * 100) : 0;
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/campaigns/${c.id}`)}
              className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 text-left w-full group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Megaphone className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                  <p className="font-semibold truncate text-sm">{c.name}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <Progress value={progress} className="h-1.5 mb-2" />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-4">
                 <span>{progress}% complete</span>
                 <span>{c.processed_contacts.toLocaleString()} / {c.total_contacts.toLocaleString()} called</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t pt-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Success</p>
                  <p className="text-sm font-bold">{c.total_contacts > 0 ? Math.round((c.success_count / c.processed_contacts || 0) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Spent</p>
                  <p className="text-sm font-bold">
                    ${(c.cost_cents / 100).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Agent</p>
                  <p className="text-sm font-bold truncate max-w-full">{c.agent_name || "N/A"}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
