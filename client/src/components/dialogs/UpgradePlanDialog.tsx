import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    features: ["1,000 calls/mo", "3 agents", "5,000 minutes", "Email support"],
    current: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    features: ["5,000 calls/mo", "10 agents", "10,000 minutes", "Priority support", "Custom integrations"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "$299",
    period: "/mo",
    features: ["Unlimited calls", "Unlimited agents", "50,000 minutes", "Dedicated support", "SLA guarantee", "SSO & SAML"],
    current: false,
  },
];

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  const [selected, setSelected] = useState("Enterprise");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change Plan</DialogTitle>
          <DialogDescription>Select the plan that best fits your needs.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <button
              key={plan.name}
              onClick={() => !plan.current && setSelected(plan.name)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-all",
                plan.current && "opacity-60 cursor-default",
                !plan.current && selected === plan.name && "border-primary ring-2 ring-primary/20",
                !plan.current && selected !== plan.name && "hover:border-primary/40"
              )}
            >
              {plan.current && (
                <Badge className="absolute -top-2 right-3 text-[10px]">Current</Badge>
              )}
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-1">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success shrink-0 mt-px" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>
            <Zap className="mr-1.5 h-3.5 w-3.5" /> Upgrade to {selected}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
