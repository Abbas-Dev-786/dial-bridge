import { useNotificationPreferencesQuery, useNotificationMutations } from "@/hooks/api/useNotifications";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Webhook, Loader2 } from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_GROUPS = [
  {
    title: "Call Alerts",
    items: [
      { id: "call_fail", label: "Call failures", description: "Get notified when a call fails or errors out" },
      { id: "call_complete", label: "Call completions", description: "Notify on successful call completion" },
    ],
  },
  {
    title: "Campaign Alerts",
    items: [
      { id: "campaign_complete", label: "Campaign completed", description: "When a campaign finishes all contacts" },
      { id: "campaign_error", label: "Campaign errors", description: "When a campaign encounters critical errors" },
    ],
  },
  {
    title: "Account Alerts",
    items: [
      { id: "low_balance", label: "Low balance", description: "When usage approaches plan limits" },
      { id: "team_invite", label: "Team invitations", description: "When someone joins your workspace" },
    ],
  },
];

export default function SettingsNotifications() {
  const { data: preferences = [], isLoading } = useNotificationPreferencesQuery();
  const { updatePreference } = useNotificationMutations();

  const handleToggle = (eventType: string, channel: 'email' | 'slack' | 'webhook', value: boolean) => {
    // Find current pref to merge
    const current = preferences.find(p => p.event_type === eventType) || {
      event_type: eventType,
      channel_email: false,
      channel_slack: false,
      channel_webhook: false,
    };

    updatePreference.mutate({
      event_type: eventType,
      channel_email: channel === 'email' ? value : current.channel_email,
      channel_slack: channel === 'slack' ? value : current.channel_slack,
      channel_webhook: channel === 'webhook' ? value : current.channel_webhook,
    }, {
      onSuccess: () => toast.success("Preference updated"),
      onError: () => toast.error("Failed to update preference")
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Configure alert preferences for different events.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {NOTIFICATION_GROUPS.map((group) => (
          <div key={group.title} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b bg-muted/30 p-4">
              <h3 className="font-semibold text-sm">{group.title}</h3>
            </div>
            <div className="divide-y">
              {group.items.map((item) => {
                const pref = preferences.find(p => p.event_type === item.id) || {
                  channel_email: false,
                  channel_slack: false,
                  channel_webhook: false
                };

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <Switch 
                          checked={pref.channel_email} 
                          onCheckedChange={(val) => handleToggle(item.id, 'email', val)}
                          disabled={updatePreference.isPending}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <Switch 
                          checked={pref.channel_slack} 
                          onCheckedChange={(val) => handleToggle(item.id, 'slack', val)}
                          disabled={updatePreference.isPending}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
                        <Switch 
                          checked={pref.channel_webhook} 
                          onCheckedChange={(val) => handleToggle(item.id, 'webhook', val)}
                          disabled={updatePreference.isPending}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
