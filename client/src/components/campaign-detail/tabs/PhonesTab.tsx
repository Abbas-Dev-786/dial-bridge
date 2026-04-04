import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCampaignStore } from "@/store/useCampaignStore";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const InfoRow = forwardRef<HTMLDivElement, { label: string; value: string; mono?: boolean }>(
  ({ label, value, mono }, ref) => (
    <div ref={ref} className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", mono && "font-mono")}>{value}</span>
    </div>
  )
);
InfoRow.displayName = "InfoRow";

export function PhonesTab() {
  const { campaignStatus } = useCampaignStore();
  const assignedPhone = { id: "1", number: "+1 (555) 100-2000", label: "Primary Outbound", type: "Local", callsMade: 642, status: "live" as const };
  const workspacePhones = [
    { id: "2", number: "+1 (555) 200-3000", label: "Backup Line", type: "Local", campaign: "—" },
    { id: "3", number: "+1 (555) 300-4000", label: "Support Line", type: "Toll-free", campaign: "Product Launch" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Calling Number</h2>
        <p className="text-sm text-muted-foreground">The number your contacts will see</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Phone className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-mono font-semibold">{assignedPhone.number}</p>
                <p className="text-xs text-muted-foreground">{assignedPhone.label} · {assignedPhone.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={assignedPhone.status} />
              <Button variant="outline" size="sm" disabled={campaignStatus === "live"}>Change Number</Button>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xl font-bold">{assignedPhone.callsMade}</p>
              <p className="text-xs text-muted-foreground">Calls Made</p>
            </div>
            <div>
              <p className="text-xl font-bold">{assignedPhone.type}</p>
              <p className="text-xs text-muted-foreground">Number Type</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3">Other Workspace Numbers</h3>
        <div className="space-y-2">
          {workspacePhones.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium">{p.number}</p>
                <p className="text-xs text-muted-foreground">{p.label} · {p.type}</p>
              </div>
              <div>
                {p.campaign !== "—" ? (
                  <Badge variant="secondary" className="text-xs">In use: {p.campaign}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Available</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
