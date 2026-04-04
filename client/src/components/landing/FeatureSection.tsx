import { FEATURES } from "@/lib/constants";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

const FeatureSection = () => {
  return (
    <section id="features" className="py-20 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Everything you need to scale voice outreach
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
            From agent creation to campaign analytics — one platform to automate
            your entire calling workflow.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="group transition-shadow hover:shadow-lg hover:shadow-primary/5 border-border/60"
            >
              <CardContent className="pt-6 space-y-3">
                <div className="inline-flex rounded-xl bg-primary/10 p-3 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
