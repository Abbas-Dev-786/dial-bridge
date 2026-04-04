import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

interface CallMetadataCardProps {
  metadata: any;
  costBreakdown: any[];
  evaluations: any[];
  collectedData: any[];
}

export function CallMetadataCard({ metadata, costBreakdown, evaluations, collectedData }: CallMetadataCardProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">Conversation Info</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: "Contact", value: metadata.contact, mono: true },
            { label: "Agent", value: metadata.agent },
            { label: "Model", value: metadata.model },
            { label: "Voice", value: metadata.voice },
            { label: "Direction", value: metadata.direction },
            { label: "Date", value: metadata.date },
            { label: "Duration", value: metadata.duration, mono: true },
          ].map((item) => (
            <div key={item.label} className="flex justify-between">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={item.mono ? "font-mono" : ""}>{item.value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={metadata.status} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">Cost Breakdown</h3>
        {costBreakdown.map((item) => (
          <div key={item.label} className={cn("flex justify-between text-sm", item.bold && "font-semibold border-t pt-2")}>
            <span className={item.bold ? "" : "text-muted-foreground"}>{item.label}</span>
            <span className="font-mono">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">Evaluation Criteria</h3>
        {evaluations.map((e) => (
          <div key={e.criteria} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{e.criteria}</span>
            <Badge variant={e.passed ? "default" : "secondary"} className={cn("text-xs", e.passed ? "bg-success text-success-foreground hover:bg-success/90" : "")}>
              {e.passed ? "Pass" : "Fail"}
            </Badge>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">Collected Data</h3>
        {collectedData.map((d) => (
          <div key={d.field} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{d.field}</span>
            <span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
