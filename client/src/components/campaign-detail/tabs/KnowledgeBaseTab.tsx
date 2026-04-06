import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, RefreshCw, AlertCircle, Link as LinkIcon, Loader2, Globe, Database, Mail, Zap, CheckCircle2, Clock } from "lucide-react";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useCampaignDetailQuery, useKnowledgeQuery, useKnowledgeSyncStatusQuery, useCampaignIntegrationsQuery, useCampaignMutations } from "@/hooks/api/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function KnowledgeBaseTab() {
  const { id } = useParams();
  const { toast } = useToast();
  const { setDialogState } = useCampaignStore();
  
  const { data: activeCampaign } = useCampaignDetailQuery(id);
  const { data: knowledgeDocs = [], isLoading } = useKnowledgeQuery(id);
  const { data: syncStatus } = useKnowledgeSyncStatusQuery(id);
  const { syncKnowledge, deleteKnowledge } = useCampaignMutations(id);

  const handleSync = () => {
    syncKnowledge.mutate(undefined, {
      onSuccess: () => toast({ title: "Sync triggered", description: "Knowledge base synchronization has started." }),
      onError: () => toast({ title: "Sync failed", variant: "destructive" })
    });
  };

  const handleDelete = (docId: string) => {
    deleteKnowledge.mutate(docId, {
      onSuccess: () => toast({ title: "Document deleted" }),
      onError: () => toast({ title: "Delete failed", variant: "destructive" })
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-success/10 text-success border-success/20";
      case "processing": return "bg-primary/10 text-primary border-primary/20";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isSyncing = syncStatus?.status === 'syncing';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">{knowledgeDocs.length} documents for agent RAG reference</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncKnowledge.isPending || isSyncing}>
            {syncKnowledge.isPending || isSyncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
          <Button size="sm" onClick={() => setDialogState("uploadDoc", true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Knowledge</Button>
        </div>
      </div>

      {(isSyncing || syncStatus?.status === 'failed') && (
        <div className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3",
          isSyncing ? "border-primary/40 bg-primary/5 text-primary" : "border-destructive/40 bg-destructive/5 text-destructive"
        )}>
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
          <div className="flex-1">
            <p className="text-sm font-medium">
              Knowledge base is {isSyncing ? "syncing" : "failed to sync"}
            </p>
            {syncStatus?.last_sync_at && (
              <p className="text-[10px] opacity-80">Last attempt: {new Date(syncStatus.last_sync_at).toLocaleString()}</p>
            )}
          </div>
          {syncStatus?.error && <p className="text-xs font-mono">{syncStatus.error}</p>}
        </div>
      )}

      {knowledgeDocs.length === 0 && !isLoading && (
        <Card className="py-10 text-center">
          <CardContent className="pt-6">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No documents added yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {knowledgeDocs.map((doc) => (
          <div key={doc.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="rounded-lg bg-primary/10 p-2.5">
              {doc.doc_type === "url_scrape" ? <LinkIcon className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold truncate">{doc.name}</p>
                <Badge variant="outline" className={cn("text-[10px] h-4 px-1 capitalize whitespace-nowrap", getStatusColor(doc.status))}>
                  {doc.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {doc.doc_type} · {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : "0 KB"} 
                {doc.page_count ? ` · ${doc.page_count} pages` : ""} 
                {doc.chunk_count ? ` · ${doc.chunk_count} chunks` : ""}
              </p>
              {doc.error_message && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-2.5 w-2.5" /> {doc.error_message}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 text-xs text-muted-foreground">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)} title="Delete document">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const IntegrationIcons: Record<string, any> = {
  gohighlevel: Globe,
  hubspot: Database,
  salesforce: Database,
  slack: Mail,
  zapier: Zap,
};

export function IntegrationsTab() {
  const { id } = useParams();
  const { setDialogState, setSelectedIntegration } = useCampaignStore();
  const { data: integrations = [] } = useCampaignIntegrationsQuery(id);
  const { toggleIntegration, deleteCampaignIntegration } = useCampaignMutations(id);
  const { toast } = useToast();

  const onToggle = (intId: string, active: boolean) => {
    toggleIntegration.mutate({ integrationId: intId, is_active: active }, {
      onSuccess: () => toast({ title: active ? "Integration enabled" : "Integration disabled" }),
      onError: () => toast({ title: "Toggle failed", variant: "destructive" })
    });
  };

  const onDelete = (intId: string) => {
    deleteCampaignIntegration.mutate(intId, {
      onSuccess: () => toast({ title: "Integration removed from campaign" }),
      onError: () => toast({ title: "Removal failed", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Campaign Integrations</h2>
        <p className="text-sm text-muted-foreground">Connect your CRM and tools to sync call data automatically.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((i) => {
          const Icon = IntegrationIcons[i.provider] || Database;
          return (
            <Card key={i.id} className={cn("transition-all", i.is_active ? "border-primary/40 bg-primary/5" : "hover:border-primary/20")}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-background border p-2"><Icon className="h-5 w-5" /></div>
                    <div>
                      <p className="font-semibold capitalize">{i.provider}</p>
                      <p className="text-xs text-muted-foreground">CRM Sync</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={i.is_active}
                      onCheckedChange={(val) => onToggle(i.id, val)}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(i.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Sync call outcome, transcripts and recordings to {i.provider}.
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs h-8"
                  onClick={() => {
                    setSelectedIntegration(i);
                    setDialogState("connectIntegration", true);
                  }}
                >
                  Configure Settings
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {integrations.length === 0 && (
          <div className="sm:col-span-2 py-10 text-center border-2 border-dashed rounded-xl">
            <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">No integrations connected to this workspace.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => (window.location.href = "/integrations")}>
              Go to Workspace Integrations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
