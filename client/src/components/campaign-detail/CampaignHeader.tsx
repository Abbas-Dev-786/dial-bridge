import { ChevronLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useNavigate, useParams } from "react-router-dom";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useCampaignDetailQuery, useCampaignMutations } from "@/hooks/api/useCampaigns";
import { STATUS_TRANSITIONS } from "@/lib/campaign-constants";
import { useToast } from "@/hooks/use-toast";

export function CampaignHeader() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { setDialogState } = useCampaignStore();
  
  const { data: activeCampaign, isLoading } = useCampaignDetailQuery(id);
  const { transitionStatus } = useCampaignMutations(id);

  const campaign = activeCampaign || { name: isLoading ? `Loading...` : `Unknown`, status: "draft" };
  const campaignStatus = activeCampaign?.status || "draft";
  const isDraft = campaignStatus === "draft";
  const availableTransitions = STATUS_TRANSITIONS[campaignStatus as keyof typeof STATUS_TRANSITIONS] || [];

  const onTransition = async (target: any) => {
    transitionStatus.mutate(target, {
      onSuccess: () => {
        toast({ title: "Status updated", description: `Campaign is now ${target}.` });
      },
      onError: () => {
        toast({ title: "Update failed", description: "Could not update status.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigate("/campaigns")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate("/campaigns")}>Campaigns</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{campaign.name}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <StatusBadge status={campaignStatus as any} />
        </div>
        <div className="flex gap-2">
          {availableTransitions.map((t) => (
            <Button
              key={t.target}
              variant={(t.variant as any) || "outline"}
              size="sm"
              onClick={() => onTransition(t.target)}
            >
              <t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setDialogState("export", true)}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {isDraft && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-warning font-medium flex-1">
            ⚠ Missing resources: Add contacts and a phone number to launch this campaign.
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialogState("importContacts", true)}>Add Contacts</Button>
            <Button size="sm" variant="outline" onClick={() => setDialogState("buyNumber", true)}>Add Phone</Button>
          </div>
        </div>
      )}
    </div>
  );
}
