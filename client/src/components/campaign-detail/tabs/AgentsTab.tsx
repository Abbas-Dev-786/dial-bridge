import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, ArrowRight, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useCampaignStore } from "@/store/useCampaignStore";

export function AgentsTab() {
  const navigate = useNavigate();
  const { campaignStatus } = useCampaignStore();
  
  const campaignAgent = {
    id: "1", name: "Sales Bot Pro", model: "GPT-4o", voice: "Nova", status: "live" as const, calls: 642, successRate: "72%",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Assigned Agent</h2>
        <p className="text-sm text-muted-foreground">This campaign uses a single agent. Manage agents on the Agents page.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Bot className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-semibold">{campaignAgent.name}</p>
                <p className="text-xs text-muted-foreground">{campaignAgent.model} · {campaignAgent.voice}</p>
              </div>
            </div>
            <StatusBadge status={campaignAgent.status} />
          </div>
          <Separator className="mb-3" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold">{campaignAgent.calls}</p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
            <div>
              <p className="text-xl font-bold">{campaignAgent.successRate}</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div>
              <p className="text-xl font-bold">{campaignAgent.model}</p>
              <p className="text-xs text-muted-foreground">Model</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/agents/${campaignAgent.id}`)}>
              View Agent <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={campaignStatus === "live"}
            >
              Change Agent
            </Button>
          </div>
          {campaignStatus === "live" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Pause the campaign to change the agent.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
