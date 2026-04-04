import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashboardStore } from "@/store/useDashboardStore";
import { ACTIVE_CAMPAIGNS } from "@/lib/mockData";

export function WelcomeBanner() {
  const navigate = useNavigate();
  const hasCampaigns = useDashboardStore((state) => state.hasCampaigns);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, Alex
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasCampaigns
              ? `You have ${ACTIVE_CAMPAIGNS.length} active campaign${ACTIVE_CAMPAIGNS.length > 1 ? "s" : ""} running`
              : "Let's get your first campaign up and running"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/campaigns")}>
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}
