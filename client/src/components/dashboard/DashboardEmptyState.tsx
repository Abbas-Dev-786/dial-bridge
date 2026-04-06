import { Bot, Megaphone, Rocket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function DashboardEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto max-w-lg text-center px-4">
        {/* Illustration */}
        <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
          <div className="relative">
            <Rocket className="h-16 w-16 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Launch your first voice campaign
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Build an AI voice agent, add it to a campaign, and start making calls
          — all in under 5 minutes.
        </p>

        {/* Steps preview */}
        <div className="mt-8 flex flex-col gap-3 text-left">
          {[
            {
              step: 1,
              icon: Bot,
              label: "Create a Campaign",
              desc: "Define your campaign goal and settings",
            },
            {
              step: 2,
              icon: Megaphone,
              label: "Set up a Campaign",
              desc: "Add contacts, assign agents & phone numbers",
            },
            {
              step: 3,
              icon: Rocket,
              label: "Go Live",
              desc: "Launch and monitor calls in real time",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {s.step}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-8 px-8"
          onClick={() => navigate("/campaigns")}
        >
          <Bot className="mr-2 h-5 w-5" /> Create Your First Agent
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          No credit card required to get started
        </p>
      </div>
    </div>
  );
}
