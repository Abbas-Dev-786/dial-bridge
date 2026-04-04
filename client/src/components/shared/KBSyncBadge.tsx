import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, Clock, AlertCircle } from "lucide-react";

export type KBSyncStatus = "pending" | "syncing" | "synced" | "failed";

const config: Record<KBSyncStatus, { label: string; icon: any; className: string; iconClass: string }> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
    iconClass: "text-muted-foreground",
  },
  syncing: {
    label: "Syncing",
    icon: CircleDashed,
    className: "bg-primary/10 text-primary border-primary/20",
    iconClass: "text-primary animate-spin",
  },
  synced: {
    label: "Synced",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
    iconClass: "text-success",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    iconClass: "text-destructive",
  },
};

interface KBSyncBadgeProps {
  status: KBSyncStatus;
  className?: string;
}

export function KBSyncBadge({ status, className }: KBSyncBadgeProps) {
  const item = config[status] || config.pending;
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
        item.className,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", item.iconClass)} />
      {item.label}
    </span>
  );
}
