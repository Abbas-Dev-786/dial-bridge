import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash2, Eye, EyeOff, Key, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { GenerateAPIKeyDialog } from "@/components/dialogs/GenerateAPIKeyDialog";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";

import { useApiKeysQuery, useApiKeyMutations } from "@/hooks/api/useSettings";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function SettingsAPI() {
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: apiKeys = [], isLoading } = useApiKeysQuery();
  const { revokeApiKey } = useApiKeyMutations();

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    revokeApiKey.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`API key "${deleteTarget.name}" revoked`);
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || "Failed to revoke API key");
      }
    });
  };

  const maskKey = (key: string) => key.slice(0, 12) + "••••••••••••";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">Manage your ElevenLabs API keys and webhook configurations</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} disabled={isLoading}><Plus className="mr-2 h-4 w-4" /> Generate Key</Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-xl border bg-card shadow-sm">
           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : apiKeys.length > 0 ? (
        <div className="space-y-3">
          {apiKeys.map((k) => (
            <div key={k.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                   <p className="font-medium text-sm">{k.name}</p>
                   <p className="text-[10px] text-muted-foreground">Created {formatDate(k.created_at)} · Last used {k.last_used_at ? formatDate(k.last_used_at) : "Never"}</p>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ id: k.id, name: k.name })}>
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
        description={`Are you sure you want to revoke the "${deleteTarget?.name}" key? Any applications using this key will stop working immediately.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
