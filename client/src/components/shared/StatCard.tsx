import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, trend, icon, children, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <p className="text-2xl font-bold font-display tracking-tight">{value}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium mb-0.5",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
