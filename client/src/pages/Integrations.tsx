import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const integrations = [
  { id: "hubspot", name: "HubSpot", description: "Sync contacts and deals with HubSpot CRM", category: "CRM", campaigns: ["Q1 Outreach", "Product Launch"], icon: "🔶" },
  { id: "salesforce", name: "Salesforce", description: "Connect to Salesforce for lead management", category: "CRM", campaigns: ["Q1 Outreach"], icon: "☁️" },
  { id: "zapier", name: "Zapier", description: "Automate workflows with 5,000+ apps", category: "Automation", campaigns: ["Q1 Outreach"], icon: "⚡" },
  { id: "slack", name: "Slack", description: "Get call notifications in Slack channels", category: "Communication", campaigns: ["Q1 Outreach", "Product Launch"], icon: "💬" },
  { id: "calendar", name: "Google Calendar", description: "Book demos in available slots", category: "Scheduling", campaigns: ["Q1 Outreach"], icon: "📅" },
  { id: "webhooks", name: "Custom Webhooks", description: "Send events to any URL endpoint", category: "Developer", campaigns: ["Q1 Outreach"], icon: "🔗" },
];

export default function Integrations() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">All connected integrations across your campaigns. Manage integrations within each campaign.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((int) => (
          <div key={int.id} className="rounded-xl border bg-card p-5 shadow-sm ring-1 ring-success/30 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <p className="font-semibold">{int.name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">{int.category}</Badge>
                </div>
              </div>
              <Check className="h-4 w-4 text-success" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{int.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {int.campaigns.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs font-normal">{c}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
