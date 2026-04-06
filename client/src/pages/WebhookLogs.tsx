import { useState, useEffect } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Trash2, Copy, Globe, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWebhooksQuery, useWebhookLogsQuery, useWebhookMutations } from "@/hooks/api/useSettings";
import { CreateWebhookEndpointDialog } from "@/components/dialogs/CreateWebhookEndpointDialog";
import { formatDistanceToNow } from "date-fns";

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  status: "pending" | "success" | "failed" | "retrying";
  attempt_number: number;
  http_status_code: number | null;
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
}

export default function WebhookLogs() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: endpoints = [], isLoading: isLoadingEndpoints } = useWebhooksQuery();
  const { data: deliveries = [], isLoading: isLoadingDeliveries } = useWebhookLogsQuery();
  const { deleteWebhook, retryDelivery } = useWebhookMutations();
  
  const isLoading = isLoadingEndpoints || isLoadingDeliveries;

  const handleRetry = (deliveryId: string) => {
    retryDelivery.mutate(deliveryId, {
      onSuccess: () => toast.success("Delivery retry initiated"),
      onError: () => toast.error("Failed to retry delivery")
    });
  };

  const handleDelete = (endpointId: string) => {
    deleteWebhook.mutate(endpointId, {
      onSuccess: () => toast.success("Endpoint deleted"),
      onError: () => toast.error("Failed to delete endpoint")
    });
  };

  const deliveryColumns: Column<WebhookDelivery>[] = [
    { 
      key: "event_type", 
      label: "Event", 
      render: (r) => <Badge variant="outline" className="font-mono text-[10px] uppercase">{r.event_type}</Badge> 
    },
    { 
      key: "status", 
      label: "Status", 
      render: (r) => <StatusBadge status={r.status === "success" ? "live" : r.status === "failed" ? "error" : "paused"} /> 
    },
    { 
      key: "http_status_code", 
      label: "Response", 
      hideOnMobile: true, 
      render: (r) => (
        <span className={`font-mono text-xs ${String(r.http_status_code).startsWith("2") ? "text-success" : "text-destructive"}`}>
          {r.http_status_code || "—"}
        </span>
      )
    },
    { 
      key: "attempt_number", 
      label: "Attempt", 
      hideOnMobile: true, 
      render: (r) => <span className="text-xs text-muted-foreground">{r.attempt_number}</span> 
    },
    { 
      key: "created_at", 
      label: "Time", 
      hideOnMobile: true, 
      render: (r) => <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span> 
    },
    { 
      key: "actions", 
      label: "", 
      render: (r) => r.status === "failed" ? (
        <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => handleRetry(r.id)}>
          <RefreshCw className="mr-1 h-3 w-3" /> Retry
        </Button>
      ) : null 
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Webhooks & Listeners</h1>
          <p className="text-xs text-muted-foreground">Configure URLs to receive event notifications</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Endpoint
        </Button>
      </div>

      <Tabs defaultValue="endpoints">
        <TabsList className="mb-4">
          <TabsTrigger value="endpoints" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-1.5 text-xs"><Globe className="h-3.5 w-3.5" /> Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          {endpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed">
              <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No endpoints configured</p>
              <Button variant="link" size="sm" onClick={() => setCreateOpen(true)}>Add your first endpoint</Button>
            </div>
          ) : (
            endpoints.map((ep) => (
              <Card key={ep.id} className="overflow-hidden shadow-sm border-muted/60">
                <CardContent className="pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={ep.is_active ? "live" : "paused"} />
                        <span className="font-mono text-sm font-bold truncate text-premium-700">{ep.url}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 shrink-0" 
                          onClick={() => { 
                            navigator.clipboard.writeText(ep.url); 
                            toast.success("URL copied to clipboard"); 
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {ep.description && (
                        <p className="text-xs text-muted-foreground mb-3">{ep.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ep.events.map((ev) => (
                          <Badge key={ev} variant="secondary" className="font-mono text-[10px] bg-muted/50 border-0">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(ep.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t text-[10px] text-muted-foreground">
                    <span className="font-bold">CREATED</span>
                    <span>{new Date(ep.created_at).toLocaleDateString()}</span>
                    <span className="ml-auto font-mono text-[11px] select-all opacity-40">ID: {ep.id}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="deliveries">
          <Card className="shadow-sm border-muted/60 overflow-hidden">
            <DataTable 
              columns={deliveryColumns} 
              data={deliveries} 
              searchKey="event_type" 
              searchPlaceholder="Search events..." 
            />
          </Card>
        </TabsContent>
      </Tabs>

      <CreateWebhookEndpointDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
