import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateWebhookEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (endpoint: { url: string; events: string[]; secret: string }) => void;
}

const WEBHOOK_EVENTS = [
  "call.started", "call.completed", "call.failed",
  "campaign.started", "campaign.paused", "campaign.completed",
  "contact.updated", "contact.opted_out",
  "agent.created", "agent.updated",
  "kb.sync_completed", "kb.sync_failed",
];

export function CreateWebhookEndpointDialog({ open, onOpenChange, onCreated }: CreateWebhookEndpointDialogProps) {
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [secret, setSecret] = useState("");

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.has(event) ? next.delete(event) : next.add(event);
      return next;
    });
  };

  const handleCreate = () => {
    if (!url.trim() || selectedEvents.size === 0) return;
    onCreated?.({ url: url.trim(), events: Array.from(selectedEvents), secret: secret.trim() });
    setUrl("");
    setSelectedEvents(new Set());
    setSecret("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook Endpoint</DialogTitle>
          <DialogDescription>Configure a URL to receive event notifications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Endpoint URL *</Label>
            <Input placeholder="https://api.example.com/webhooks" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Subscribe to Events *</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto border rounded-lg p-3">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent/50 rounded px-1.5 -mx-1.5">
                  <Checkbox checked={selectedEvents.has(event)} onCheckedChange={() => toggleEvent(event)} />
                  <span className="text-xs font-mono">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Signing Secret (optional)</Label>
            <Input placeholder="whsec_..." value={secret} onChange={(e) => setSecret(e.target.value)} />
            <p className="text-xs text-muted-foreground">Used to verify webhook payloads. Leave blank to auto-generate.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!url.trim() || selectedEvents.size === 0}>Create Endpoint</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
