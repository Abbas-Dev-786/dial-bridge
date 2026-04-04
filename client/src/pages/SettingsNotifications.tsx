import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Webhook } from "lucide-react";

const notificationGroups = [
  {
    title: "Call Alerts",
    items: [
      { id: "call-fail", label: "Call failures", description: "Get notified when a call fails or errors out", email: true, slack: true, webhook: false },
      { id: "call-complete", label: "Call completions", description: "Notify on successful call completion", email: false, slack: true, webhook: true },
    ],
  },
  {
    title: "Campaign Alerts",
    items: [
      { id: "campaign-complete", label: "Campaign completed", description: "When a campaign finishes all contacts", email: true, slack: true, webhook: true },
      { id: "campaign-error", label: "Campaign errors", description: "When a campaign encounters critical errors", email: true, slack: true, webhook: false },
    ],
  },
  {
    title: "Account Alerts",
    items: [
      { id: "low-balance", label: "Low balance", description: "When usage approaches plan limits", email: true, slack: false, webhook: false },
      { id: "team-invite", label: "Team invitations", description: "When someone joins your workspace", email: true, slack: false, webhook: false },
    ],
  },
];

export default function SettingsNotifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Configure alert preferences</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {notificationGroups.map((group) => (
          <div key={group.title} className="rounded-xl border bg-card shadow-sm">
            <div className="border-b p-4">
              <h3 className="font-semibold">{group.title}</h3>
            </div>
            <div className="divide-y">
              {group.items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <Switch defaultChecked={item.email} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <Switch defaultChecked={item.slack} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
                      <Switch defaultChecked={item.webhook} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button>Save Preferences</Button>
        </div>
      </div>
    </div>
  );
}
