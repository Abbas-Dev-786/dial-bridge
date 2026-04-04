import { Button } from "@/components/ui/button";
import { Plus, FileText, File, ExternalLink, Trash2 } from "lucide-react";
import { KNOWLEDGE_DOCS, CAMPAIGN_INTEGRATIONS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useCampaignStore } from "@/store/useCampaignStore";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export function KnowledgeBaseTab() {
  const { setDialogState } = useCampaignStore();
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">{KNOWLEDGE_DOCS.length} documents for agent RAG reference</p>
        </div>
        <Button size="sm" onClick={() => setDialogState("uploadDoc", true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Knowledge</Button>
      </div>

      <div className="flex items-center gap-3 rounded-lg border px-4 py-3 border-success/40 bg-success/5">
        <div className="h-2.5 w-2.5 rounded-full bg-success shrink-0" />
        <p className="text-sm font-medium text-success">Knowledge base is synced to ElevenLabs</p>
      </div>

      <div className="grid gap-3">
        {KNOWLEDGE_DOCS.map((doc) => (
          <div key={doc.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="rounded-lg bg-primary/10 p-2.5">
              {doc.name.endsWith(".pdf") ? <FileText className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground">{doc.size} · {doc.pages} pages · Updated {doc.lastUpdated}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsTab() {
  const { integrationToggles, setIntegrationToggles, setDialogState, setSelectedIntegration } = useCampaignStore();

  const handleToggle = (id: string, val: boolean) => {
    setIntegrationToggles({ ...integrationToggles, [id]: val });
  };

  const handleConfigure = (i: any) => {
    setSelectedIntegration(i);
    setDialogState("connectIntegration", true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">Manage data syncing and automation for this campaign.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPAIGN_INTEGRATIONS.map((i) => (
          <Card key={i.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{i.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{i.name}</h3>
                    <p className="text-xs text-muted-foreground">{i.description}</p>
                  </div>
                </div>
                <Switch 
                  checked={integrationToggles[i.id]} 
                  onCheckedChange={(val) => handleToggle(i.id, val)}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={() => handleConfigure(i)}
                >
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
