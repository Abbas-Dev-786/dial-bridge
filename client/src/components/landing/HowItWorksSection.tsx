import { BarChart3, Bot, Headphones } from "lucide-react";
import { Badge } from "../ui/badge";

const HowItWorksSection = () => {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
            How It Works
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Go live in under 10 minutes
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Create Your Agent",
              desc: "Pick a voice, write a prompt, and configure tools. Your AI agent is ready to call in minutes.",
              icon: Bot,
            },
            {
              step: "02",
              title: "Launch a Campaign",
              desc: "Upload contacts, assign agents, set schedules and retry policies. Hit start.",
              icon: Headphones,
            },
            {
              step: "03",
              title: "Monitor & Optimize",
              desc: "Track calls in real-time, review transcripts, and refine your agents with actionable insights.",
              icon: BarChart3,
            },
          ].map((item) => (
            <div key={item.step} className="relative text-center group">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-xs font-mono text-primary font-bold">
                {item.step}
              </span>
              <h3 className="mt-1 text-lg font-display font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
