import { cn } from "@/lib/utils";

type Status = "live" | "paused" | "error" | "draft" | "ready" | "completed" | "scheduled" | "archived" | "active" | "inactive" | "released" | "porting";

const statusConfig: Record<Status, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  live: { label: "Live", dotClass: "bg-success animate-pulse-dot", bgClass: "bg-success/10", textClass: "text-success" },
  active: { label: "Active", dotClass: "bg-success animate-pulse-dot", bgClass: "bg-success/10", textClass: "text-success" },
  paused: { label: "Paused", dotClass: "bg-warning", bgClass: "bg-warning/10", textClass: "text-warning" },
  inactive: { label: "Inactive", dotClass: "bg-warning", bgClass: "bg-warning/10", textClass: "text-warning" },
  error: { label: "Error", dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive" },
  draft: { label: "Draft", dotClass: "bg-muted-foreground", bgClass: "bg-muted", textClass: "text-muted-foreground" },
  ready: { label: "Ready", dotClass: "bg-[hsl(210_80%_55%)]", bgClass: "bg-[hsl(210_80%_55%)]/10", textClass: "text-[hsl(210_80%_55%)]" },
  completed: { label: "Completed", dotClass: "bg-success", bgClass: "bg-success/10", textClass: "text-success" },
  scheduled: { label: "Scheduled", dotClass: "bg-blue-500", bgClass: "bg-blue-500/10", textClass: "text-blue-600" },
  porting: { label: "Porting", dotClass: "bg-blue-500", bgClass: "bg-blue-500/10", textClass: "text-blue-600" },
  archived: { label: "Archived", dotClass: "bg-slate-400", bgClass: "bg-slate-400/10", textClass: "text-slate-500" },
  released: { label: "Released", dotClass: "bg-slate-400", bgClass: "bg-slate-400/10", textClass: "text-slate-500" },
};

const fallbackConfig = {
  label: "Unknown",
  dotClass: "bg-muted-foreground",
  bgClass: "bg-muted",
  textClass: "text-muted-foreground",
};

interface StatusBadgeProps {
  status: any;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as Status] || fallbackConfig;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}
