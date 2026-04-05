import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Check, RefreshCw, Plus } from "lucide-react";
import { workspaceRequest } from "@/lib/api";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PhonesTab() {
  const { id } = useParams();
  const { activeCampaign, assignPhone, setDialogState, campaignStatus } = useCampaignStore();
  const { toast } = useToast();
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [open, setOpen] = useState(false);

  const currentPhone = activeCampaign?.phone_number;

  const fetchWorkspaceNumbers = async () => {
    setIsLoadingNumbers(true);
    try {
      const res = await workspaceRequest.get<any[]>("/phone-numbers");
      setAvailableNumbers(res.data);
    } catch (error) {
      toast({ title: "Failed to fetch numbers", variant: "destructive" });
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  const handleAssign = async (numId: string) => {
    if (!id) return;
    setIsAssigning(true);
    try {
      await assignPhone(id, numId);
      toast({ title: "Phone number assigned" });
      setOpen(false);
    } catch (error) {
      toast({ title: "Assignment failed", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Phone Numbers</h2>
          <p className="text-sm text-muted-foreground">Manage the caller ID for this campaign.</p>
        </div>
        <Button size="sm" onClick={() => setDialogState("buyNumber", true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Buy New Number</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Active Number</CardTitle>
        </CardHeader>
        <CardContent>
          {currentPhone ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono">{currentPhone.phone_number}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentPhone.provider} · {currentPhone.status}</p>
                </div>
              </div>
              
              <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) fetchWorkspaceNumbers(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={campaignStatus === "live"}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Change Number
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Phone Number</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                    {isLoadingNumbers ? (
                      <p className="text-center py-4 text-sm text-muted-foreground">Loading numbers...</p>
                    ) : availableNumbers.length === 0 ? (
                      <p className="text-center py-4 text-sm text-muted-foreground">No available numbers in workspace.</p>
                    ) : (
                      availableNumbers.map((num) => (
                        <div 
                          key={num.id} 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                            currentPhone?.id === num.id && "border-primary bg-primary/5"
                          )}
                          onClick={() => handleAssign(num.id)}
                        >
                          <div>
                            <p className="font-mono font-medium">{num.phone_number}</p>
                            <p className="text-xs text-muted-foreground capitalize">{num.friendly_name || num.provider}</p>
                          </div>
                          {currentPhone?.id === num.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : isAssigning ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">No phone number assigned to this campaign.</p>
              <Button size="sm" variant="outline" onClick={() => { setOpen(true); fetchWorkspaceNumbers(); }}>
                Assign Workspace Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {campaignStatus === "live" && currentPhone && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Pause campaign to change the assigned number.
        </p>
      )}
    </div>
  );
}
