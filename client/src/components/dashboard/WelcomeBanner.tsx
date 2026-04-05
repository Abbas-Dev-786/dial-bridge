import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

interface WelcomeBannerProps {
  activeCount: number;
}

export function WelcomeBanner({ activeCount }: WelcomeBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount > 0
              ? `You have ${activeCount} active campaign${activeCount > 1 ? "s" : ""} running`
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
