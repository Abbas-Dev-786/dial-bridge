import { useState } from "react";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Trash2, Copy, Eye, Globe, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateWebhookEndpointDialog } from "@/components/dialogs/CreateWebhookEndpointDialog";

/* ── Mock Data ─────────────────────────────── */

const webhookEndpoints = [
  { id: "ep-1", url: "https://api.acme.com/hooks/calls", events: ["call.completed", "call.failed"], status: "live" as const, secret: "whsec_abc...xyz", deliveries: 342, lastDelivery: "2 min ago", failRate: "1.2%" },
  { id: "ep-2", url: "https://api.acme.com/hooks/campaigns", events: ["campaign.started", "campaign.completed", "campaign.paused"], status: "live" as const, secret: "whsec_def...uvw", deliveries: 28, lastDelivery: "1 hr ago", failRate: "3.6%" },
  { id: "ep-3", url: "https://hooks.slack.com/services/T00/B00/xxx", events: ["call.completed"], status: "paused" as const, secret: "whsec_ghi...rst", deliveries: 0, lastDelivery: "—", failRate: "—" },
];

const deliveryLogs = [
  { id: "1", endpoint: "https://api.acme.com/hooks/calls", event: "call.completed", status: "live" as const, responseCode: "200", time: "2 min ago", duration: "120ms" },
  { id: "2", endpoint: "https://api.acme.com/hooks/calls", event: "call.completed", status: "live" as const, responseCode: "200", time: "5 min ago", duration: "95ms" },
  { id: "3", endpoint: "https://api.acme.com/hooks/campaigns", event: "campaign.updated", status: "error" as const, responseCode: "500", time: "12 min ago", duration: "2100ms" },
  { id: "4", endpoint: "https://api.acme.com/hooks/calls", event: "call.failed", status: "live" as const, responseCode: "200", time: "18 min ago", duration: "88ms" },
  { id: "5", endpoint: "https://api.acme.com/hooks/campaigns", event: "campaign.started", status: "live" as const, responseCode: "201", time: "1 hr ago", duration: "145ms" },
  { id: "6", endpoint: "https://api.acme.com/hooks/calls", event: "call.completed", status: "error" as const, responseCode: "timeout", time: "2 hrs ago", duration: "30000ms" },
];

const deliveryColumns: Column<typeof deliveryLogs[0]>[] = [
  { key: "event", label: "Event", render: (r) => <Badge variant="secondary" className="font-mono text-xs">{r.event}</Badge> },
  { key: "endpoint", label: "Endpoint", hideOnMobile: true, render: (r) => <span className="font-mono text-xs truncate max-w-[200px] block">{r.endpoint}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "responseCode", label: "Response", hideOnMobile: true, render: (r) => (
    <span className={`font-mono text-sm ${r.responseCode.startsWith("2") ? "text-success" : "text-destructive"}`}>{r.responseCode}</span>
  )},
  { key: "duration", label: "Latency", hideOnMobile: true, render: (r) => <span className="font-mono text-xs">{r.duration}</span> },
  { key: "time", label: "Time", hideOnMobile: true },
  { key: "actions", label: "", render: (r) => r.status === "error" ? (
    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
      <RefreshCw className="mr-1 h-3 w-3" /> Retry
    </Button>
  ) : null },
];

export default function WebhookLogs() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-sm text-muted-foreground">Manage webhook endpoints and monitor deliveries</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Endpoint
        </Button>
      </div>

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-4 space-y-3">
          {webhookEndpoints.map((ep) => (
            <Card key={ep.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={ep.status} />
                      <span className="font-mono text-sm truncate">{ep.url}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText(ep.url); toast({ title: "Copied" }); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ep.events.map((ev) => (
                        <Badge key={ev} variant="secondary" className="font-mono text-xs">{ev}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center hidden sm:block">
                      <p className="font-bold">{ep.deliveries}</p>
                      <p className="text-xs text-muted-foreground">Deliveries</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="font-bold">{ep.failRate}</p>
                      <p className="text-xs text-muted-foreground">Fail Rate</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span>Secret: <span className="font-mono">{ep.secret}</span></span>
                  <span>Last delivery: {ep.lastDelivery}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <DataTable columns={deliveryColumns} data={deliveryLogs} searchKey="event" searchPlaceholder="Search events..." />
        </TabsContent>
      </Tabs>

      <CreateWebhookEndpointDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(ep) => toast({ title: "Webhook endpoint created", description: `Events will be sent to ${ep.url}` })}
      />
    </div>
  );
}
