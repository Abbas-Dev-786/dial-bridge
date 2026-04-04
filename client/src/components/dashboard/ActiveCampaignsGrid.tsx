import { ChevronRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useNavigate } from "react-router-dom";
import { ACTIVE_CAMPAIGNS } from "@/lib/mockData";
import { useDashboardStore } from "@/store/useDashboardStore";

export function ActiveCampaignsGrid() {
  const navigate = useNavigate();
  const hasCampaigns = useDashboardStore((state) => state.hasCampaigns);

  if (!hasCampaigns) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Active Campaigns</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/campaigns")}
          className="text-muted-foreground"
        >
          View All <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIVE_CAMPAIGNS.map((c) => {
          const progress = Math.round((c.called / c.total) * 100);
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/campaigns/${c.id}`)}
              className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 text-left w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Megaphone className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-semibold truncate">{c.name}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <Progress value={progress} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground mb-3">
                {c.called.toLocaleString()} / {c.total.toLocaleString()}{" "}
                called · {progress}%
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Success</p>
                  <p className="text-sm font-semibold">{c.successRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spent</p>
                  <p className="text-sm font-semibold">
                    ${c.spent.toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agents</p>
                  <p className="text-sm font-semibold">{c.agents}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Last activity: {c.lastActivity}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
