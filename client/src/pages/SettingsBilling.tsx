import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, Bot, Zap } from "lucide-react";
import { UpgradePlanDialog } from "@/components/dialogs/UpgradePlanDialog";

const invoices = [
  { date: "Mar 1, 2026", amount: "$99.00", status: "Paid" },
  { date: "Feb 1, 2026", amount: "$99.00", status: "Paid" },
  { date: "Jan 1, 2026", amount: "$99.00", status: "Paid" },
];

export default function SettingsBilling() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription</p>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Pro Plan</h3>
              <Badge className="bg-primary/10 text-primary border-0">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">$99/month · Renews Mar 1, 2026</p>
          </div>
          <Button variant="outline" onClick={() => setUpgradeOpen(true)}>Upgrade Plan</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Phone className="h-4 w-4" /> Calls
          </div>
          <p className="text-xl font-bold">1,250 <span className="text-sm font-normal text-muted-foreground">/ 5,000</span></p>
          <Progress value={25} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Bot className="h-4 w-4" /> Agents
          </div>
          <p className="text-xl font-bold">3 <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
          <Progress value={30} className="mt-2 h-1.5" />
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Zap className="h-4 w-4" /> Minutes
          </div>
          <p className="text-xl font-bold">4,320 <span className="text-sm font-normal text-muted-foreground">/ 10,000</span></p>
          <Progress value={43} className="mt-2 h-1.5" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-semibold">Invoice History</h3>
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.date} className="flex items-center justify-between text-sm">
              <span>{inv.date}</span>
              <span className="font-mono">{inv.amount}</span>
              <Badge variant="secondary">{inv.status}</Badge>
              <Button variant="ghost" size="sm" className="text-xs">Download</Button>
            </div>
          ))}
        </div>
      </div>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
