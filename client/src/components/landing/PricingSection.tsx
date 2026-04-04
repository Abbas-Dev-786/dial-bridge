import { PRICING_PLANS } from "@/lib/constants";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Check, ChevronRight } from "lucide-react";
import { Separator } from "../ui/separator";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
            Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative transition-shadow h-full",
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border/60 hover:shadow-md",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 text-xs">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardContent className="pt-8 pb-6 space-y-6">
                <div>
                  <h3 className="font-display font-semibold text-lg">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}{" "}
                  {plan.popular && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
                <Separator />
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
