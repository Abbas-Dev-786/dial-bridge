import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2, Eye, EyeOff, Key } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { GenerateAPIKeyDialog } from "@/components/dialogs/GenerateAPIKeyDialog";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";

const apiKeys = [
  { id: "1", name: "Production", key: "vai_prod_sk_1a2b3c4d5e6f7g8h9i0j", created: "Jan 15, 2026", lastUsed: "2 min ago" },
  { id: "2", name: "Development", key: "vai_dev_sk_9z8y7x6w5v4u3t2s1r0q", created: "Feb 1, 2026", lastUsed: "3 days ago" },
];

export default function SettingsAPI() {
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
  };

  const maskKey = (key: string) => key.slice(0, 12) + "••••••••••••";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">Manage your ElevenLabs API keys and webhook configurations</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Generate Key</Button>
      </div>

      {apiKeys.length > 0 ? (
        <div className="space-y-3">
          {apiKeys.map((k) => (
            <div key={k.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">Created {k.created} · Last used {k.lastUsed}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    {visibleKeys.includes(k.id) ? k.key : maskKey(k.key)}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVisibility(k.id)}>
                    {visibleKeys.includes(k.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(k.key)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(k.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Key} title="No API keys" description="Generate an API key to integrate with your systems." actionLabel="Generate Key" onAction={() => setGenerateOpen(true)} />
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
        <p className="text-sm font-medium">ElevenLabs API Integration</p>
        <p className="text-sm text-muted-foreground">
          This platform wraps the ElevenLabs Conversational AI API. Your API key is used to manage agents, conversations, and telephony.{" "}
          <a href="https://elevenlabs.io/docs/api-reference" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View ElevenLabs API Docs →</a>
        </p>
      </div>

      <GenerateAPIKeyDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Revoke API Key"
        description={`Are you sure you want to revoke the "${deleteTarget}" key? Any applications using this key will stop working immediately.`}
        onConfirm={() => setDeleteTarget(null)}
      />
    </div>
  );
}
