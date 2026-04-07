import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Check,
  RefreshCw,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useCampaignStore } from "@/store/useCampaignStore";
import {
  useCampaignDetailQuery,
  useCampaignMutations,
} from "@/hooks/api/useCampaigns";
import { usePhoneNumbersQuery } from "@/hooks/api/usePhoneNumbers";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, getErrorMessage } from "@/lib/utils";

export function PhonesTab() {
  const { id } = useParams();
  const { setDialogState } = useCampaignStore();

  const { data: activeCampaign, isLoading: isLoadingCampaign } =
    useCampaignDetailQuery(id);
  const { assignPhone } = useCampaignMutations(id);
  const { data: workspaceNumbers = [], isLoading: isLoadingNumbers } =
    usePhoneNumbersQuery();
  const campaignStatus = activeCampaign?.status || "draft";

  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const currentPhone = activeCampaign?.phone_number;

  const handleAssign = (numId: string) => {
    assignPhone.mutate(numId, {
      onSuccess: () => {
        toast({ title: "Phone number assigned" });
        setOpen(false);
      },
      onError: (err: any) => {
        toast({
          title: "Assignment failed",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      },
    });
  };

  if (isLoadingCampaign) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Phone Numbers</h2>
          <p className="text-sm text-muted-foreground">
            Manage the caller ID for this campaign.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogState("buyNumber", true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Buy New Number
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Active Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPhone ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono">{currentPhone}</p>
                  {/* <p className="text-xs text-muted-foreground capitalize">
                    {currentPhone.provider} · {currentPhone.status}
                  </p> */}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={campaignStatus === "live"}
                onClick={() => setOpen(true)}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Change Number
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Phone className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No phone number assigned to this campaign.
              </p>
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                Assign Workspace Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {campaignStatus === "live" && currentPhone && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Pause campaign to change the
          assigned number.
        </p>
      )}

      {/* Assignment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Phone Number</DialogTitle>
            <DialogDescription>
              Choose a number from your workspace to use as the caller ID for
              this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-1">
            {isLoadingNumbers ? (
              <div className="py-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading workspace numbers...
                </p>
              </div>
            ) : workspaceNumbers.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed rounded-xl">
                <Phone className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No numbers found in workspace.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setDialogState("buyNumber", true);
                  }}
                >
                  Buy a number first
                </Button>
              </div>
            ) : (
              workspaceNumbers.map((num: any) => (
                <div
                  key={num.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                    currentPhone?.id === num.id
                      ? "border-primary bg-primary/5 cursor-default"
                      : "border-transparent bg-muted/30 hover:border-primary/20 hover:bg-muted/50 cursor-pointer",
                  )}
                  onClick={() =>
                    currentPhone?.id !== num.id && handleAssign(num.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg bg-background border",
                        currentPhone?.id === num.id &&
                          "border-primary/20 text-primary",
                      )}
                    >
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm">
                        {num.number}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        {num.friendly_name || num.provider}
                      </p>
                    </div>
                  </div>
                  {currentPhone?.id === num.id ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-primary/10 text-primary hover:bg-primary/10 border-0"
                    >
                      Active
                    </Badge>
                  ) : assignPhone.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Select
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
