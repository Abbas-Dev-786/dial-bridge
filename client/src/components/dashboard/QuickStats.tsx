import { QUICK_STATS } from "@/lib/mockData";

export function QuickStats() {
  return (
    <div className="lg:col-span-2 space-y-4">
      <h2 className="text-lg font-semibold">Quick Stats</h2>
      {QUICK_STATS.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className={`rounded-lg bg-primary/10 p-2.5 ${stat.color}`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-semibold truncate">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        </div>
      ))}
      <UsageCard />
    </div>
  );
}

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function UsageCard() {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Monthly plan usage</p>
        <Badge variant="secondary" className="text-xs">
          25%
        </Badge>
      </div>
      <Progress value={25} className="h-2 mb-2" />
      <p className="text-xs text-muted-foreground mb-3">
        1,250 of 5,000 calls used
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => navigate("/settings/billing")}
      >
        Upgrade Plan <ArrowRight className="ml-2 h-3 w-3" />
      </Button>
    </div>
  );
}
