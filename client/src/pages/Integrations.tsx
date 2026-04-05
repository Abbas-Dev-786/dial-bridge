import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Plus, ScrollText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { workspaceRequest } from "@/lib/api";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConnectApiKeyModal } from "@/components/dialogs/ConnectApiKeyModal";
import { ConnectWebhookModal } from "@/components/dialogs/ConnectWebhookModal";

interface Provider {
  id: string;
  key: string;
  display_name: string;
  icon_url: string | null;
  auth_method: "oauth" | "api_key" | "webhook_secret";
  category: string;
  oauth_scopes?: string[];
}

interface WorkspaceIntegration {
  id: string;
  provider: Provider;
  status: "connected" | "inactive" | "error" | "disconnected";
  active_campaign_count: number;
  config: any;
  error_message?: string;
}

export default function Integrations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [installed, setInstalled] = useState<WorkspaceIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [providersRes, installedRes] = await Promise.all([
        workspaceRequest.get<Provider[]>("/integrations/providers"),
        workspaceRequest.get<WorkspaceIntegration[]>("/integrations")
      ]);
      setProviders(providersRes.data);
      setInstalled(installedRes.data);
    } catch (error) {
      console.error("Failed to fetch integration data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = async (provider: Provider) => {
    if (provider.auth_method === "oauth") {
      try {
        const res = await workspaceRequest.get<{ authorization_url: string }>(`/integrations/${provider.key}/oauth/initiate`);
        window.location.href = res.data.authorization_url;
      } catch (error) {
        toast({
          title: "OAuth failed",
          description: "Could not initiate OAuth flow.",
          variant: "destructive"
        });
      }
    } else if (provider.auth_method === "api_key") {
      setSelectedProvider(provider);
      setIsApiKeyModalOpen(true);
    } else if (provider.auth_method === "webhook_secret") {
      setSelectedProvider(provider);
      setIsWebhookModalOpen(true);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) return;
    try {
      await workspaceRequest.delete(`/integrations/${integrationId}`);
      toast({ title: "Integration disconnected" });
      fetchData();
    } catch (error) {
      toast({ title: "Disconnect failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectedMap = installed.reduce((acc, current) => {
    acc[current.provider.key] = current;
    return acc;
  }, {} as Record<string, WorkspaceIntegration>);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">Manage service-level connections for your workspace.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/integrations/webhooks")}>
          <ScrollText className="mr-2 h-4 w-4" /> Webhook Settings
        </Button>
      </div>

      <div className="space-y-8">
        {/* Connected Section */}
        {installed.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
               <CheckCircle className="h-5 w-5 text-success" /> Connected Integrations
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {installed.map((item) => (
                <div key={item.id} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      {item.provider.icon_url ? (
                        <img src={item.provider.icon_url} alt={item.provider.display_name} className="h-10 w-10 object-contain rounded-lg" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">🔌</div>
                      )}
                      <div>
                        <p className="font-semibold">{item.provider.display_name}</p>
                        <StatusBadge status={item.status} className="mt-1" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Category</span>
                      <span className="font-medium text-foreground">{item.provider.category}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Active Campaigns</span>
                      <Badge variant="secondary" className="font-medium">{item.active_campaign_count}</Badge>
                    </div>
                    {item.error_message && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20 text-[10px] text-destructive italic">
                            Error: {item.error_message}
                        </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => fetchData()}>
                      Manage
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => handleDisconnect(item.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
             <Plus className="h-5 w-5" /> Explore Providers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => {
              const integration = connectedMap[p.key];
              if (integration) return null;

              return (
                <div key={p.id} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {p.icon_url ? (
                        <img src={p.icon_url} alt={p.display_name} className="h-10 w-10 object-contain rounded-lg" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">🔌</div>
                      )}
                      <div>
                        <p className="font-semibold">{p.display_name}</p>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{p.category}</Badge>
                      </div>
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted uppercase tracking-tighter">
                      {p.auth_method.replace("_", " ")}
                    </div>
                  </div>
                  
                  <p className="mt-4 text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    Connect to synchronize contacts, trigger calls, and update leads automatically.
                  </p>

                  <Button className="mt-5 w-full text-xs font-semibold" size="sm" onClick={() => handleConnect(p)}>
                    Connect {p.display_name}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <ConnectApiKeyModal 
        open={isApiKeyModalOpen} 
        onOpenChange={setIsApiKeyModalOpen} 
        provider={selectedProvider} 
        onConnected={fetchData} 
      />
      
      <ConnectWebhookModal 
        open={isWebhookModalOpen} 
        onOpenChange={setIsWebhookModalOpen} 
        provider={selectedProvider} 
        onConnected={fetchData} 
      />
    </div>
  );
}
