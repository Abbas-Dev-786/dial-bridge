import { useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, ArrowRight, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useCampaignStore } from "@/store/useCampaignStore";

export function AgentsTab() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { campaignStatus, activeCampaign, regenerateAgent } = useCampaignStore();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();
  
  const agent = activeCampaign?.agent;

  const handleRegenerate = async () => {
    if (!id) return;
    setIsRegenerating(true);
    try {
      await regenerateAgent(id);
      toast({ title: "Agent regenerated", description: "The agent has been updated based on the campaign goal." });
    } catch (error) {
      toast({ title: "Regeneration failed", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!agent) {
    return (
      <Card>
        <CardContent className="pt-5 text-center py-10">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">No agent assigned to this campaign.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Assigned Agent</h2>
        <p className="text-sm text-muted-foreground">This agent handles all calls for this campaign. You can regenerate it from the campaign goal.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Bot className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-semibold">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.llm_model} · {agent.voice_config?.voice_id || agent.voice_id}</p>
              </div>
            </div>
            <StatusBadge status={agent.status || "ready"} />
          </div>
          <Separator className="mb-3" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold">{activeCampaign?.calls_total || 0}</p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
            <div>
              <p className="text-xl font-bold">
                {activeCampaign?.contacts_called > 0 
                  ? Math.round((activeCampaign.calls_successful / activeCampaign.contacts_called) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div>
              <p className="text-xl font-bold truncate px-1" title={agent.llm_model}>{agent.llm_model.split("-")[0]}</p>
              <p className="text-xs text-muted-foreground">Model</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/agents/${agent.id}`)}>
              View Agent Details <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || campaignStatus === "live"}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Agent"}
            </Button>
          </div>
          {campaignStatus === "live" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Pause the campaign to regenerate the agent.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
