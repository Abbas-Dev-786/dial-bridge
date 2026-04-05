import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { workspaceRequest } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateWebhookEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
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
  const [description, setDescription] = useState("");
  const [maxRetries, setMaxRetries] = useState(3);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.has(event) ? next.delete(event) : next.add(event);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!url.trim() || selectedEvents.size === 0) {
      toast.error("Please provide a URL and select at least one event");
      return;
    }
    
    setIsCreating(true);
    try {
      await workspaceRequest.post("/webhooks/endpoints", {
        url: url.trim(),
        description: description.trim() || null,
        events: Array.from(selectedEvents),
        max_retries: maxRetries,
      });
      
      toast.success("Webhook endpoint created successfully");
      setUrl("");
      setDescription("");
      setMaxRetries(3);
      setSelectedEvents(new Set());
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create webhook endpoint");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook Endpoint</DialogTitle>
          <DialogDescription>Configure a URL to receive event notifications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Endpoint URL *</Label>
            <Input 
              placeholder="https://api.example.com/webhooks" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Description</Label>
            <Input 
              placeholder="e.g. CRM Integration" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Subscribe to Events *</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto border rounded-lg p-3 bg-muted/20">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent/50 rounded px-1.5 -mx-1.5">
                  <Checkbox 
                    checked={selectedEvents.has(event)} 
                    onCheckedChange={() => toggleEvent(event)}
                    disabled={isCreating}
                  />
                  <span className="text-[10px] font-mono">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Max Retries</Label>
            <Input 
              type="number" 
              min={0} 
              max={10} 
              value={maxRetries} 
              onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
              disabled={isCreating}
            />
            <p className="text-[10px] text-muted-foreground italic">Number of retry attempts if the delivery fails (0-10).</p>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !url.trim() || selectedEvents.size === 0}>
            {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
