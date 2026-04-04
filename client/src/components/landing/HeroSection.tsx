import {
  ArrowRight,
  Play,
  Sparkles,
  PhoneCall,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

const STATS = [
  {
    icon: PhoneCall,
    label: "Active Calls",
    value: "24",
    color: "text-primary",
  },
  {
    icon: TrendingUp,
    label: "Success Rate",
    value: "68%",
    color: "text-success",
  },
  {
    icon: Users,
    label: "Contacted",
    value: "842",
    color: "text-foreground",
  },
  {
    icon: Clock,
    label: "Avg. Duration",
    value: "2:34",
    color: "text-foreground",
  },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 sm:py-28 lg:py-36">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-60 -left-40 h-[400px] w-[400px] rounded-full bg-warning/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <Badge
          variant="secondary"
          className="mb-6 px-4 py-1.5 text-xs font-medium"
        >
          <Sparkles className="mr-1.5 h-3 w-3" />
          Now with GPT-4o Voice — Human-quality conversations
        </Badge>

        <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
          AI voice agents that <span className="text-primary">close deals</span>{" "}
          while you sleep
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Deploy human-sounding AI agents to handle outbound calls, book demos,
          and qualify leads — at a fraction of the cost. Scale from 10 to
          100,000 calls per day.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="h-12 px-8 text-base"
            onClick={() => navigate("/signup")}
          >
            Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base group"
          >
            <Play className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
            Watch Demo
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · 14-day free trial · Cancel anytime
        </p>

        {/* Hero visual — stylized dashboard preview */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
            <div className="flex items-center gap-1.5 border-b px-4 py-3 bg-muted/50">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">
                dialbridge.ai/dashboard
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border bg-background p-3 text-center"
                  >
                    <stat.icon
                      className={cn("h-4 w-4 mx-auto mb-1", stat.color)}
                    />
                    <p className="text-lg font-bold font-mono">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="h-32 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border flex items-end px-4 pb-4 gap-2">
                {[40, 55, 45, 65, 60, 80, 72, 90, 85, 95, 88, 75].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/30 rounded-sm transition-all"
                      style={{ height: `${h}%` }}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
