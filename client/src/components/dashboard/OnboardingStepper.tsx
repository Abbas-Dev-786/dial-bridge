import { Check, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ONBOARDING_STEPS } from "@/lib/mockData";
import { useDashboardStore } from "@/store/useDashboardStore";

export function OnboardingStepper() {
  const navigate = useNavigate();
  const { completedSteps, showOnboarding } = useDashboardStore();

  if (!showOnboarding) return null;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Getting Started</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = i < completedSteps;
          const active = i === completedSteps;
          return (
            <button
              key={step.key}
              onClick={() => navigate(step.href)}
              className={`flex-1 flex items-center gap-3 rounded-lg border p-4 transition-all text-left ${
                done
                  ? "border-primary/30 bg-primary/5"
                  : active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                    : "border-border bg-muted/30 opacity-60"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {done ? "Completed" : active ? "Next step" : "Upcoming"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
