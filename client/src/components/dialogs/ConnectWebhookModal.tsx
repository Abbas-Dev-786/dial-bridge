import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { workspaceRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ConnectWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: { key: string; display_name: string } | null;
  onConnected: () => void;
}

export function ConnectWebhookModal({ open, onOpenChange, provider, onConnected }: ConnectWebhookModalProps) {
  const { toast } = useToast();
  const [endpointUrl, setEndpointUrl] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!provider) return;
    setIsConnecting(true);
    try {
      await workspaceRequest.post(`/integrations/${provider.key}/connect-webhook`, {
        endpoint_url: endpointUrl,
        signing_secret: signingSecret || null
      });
      toast({
        title: "Integration Connected",
        description: `Successfully connected ${provider.display_name}.`,
      });
      onConnected();
      onOpenChange(false);
      setEndpointUrl("");
      setSigningSecret("");
    } catch (error) {
      console.error("Connection failed", error);
      toast({
        title: "Connection Failed",
        description: "Please check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {provider?.display_name}</DialogTitle>
          <DialogDescription>
            Enter your webhook details to authorize the integration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="endpointUrl">Endpoint URL</Label>
            <Input
              id="endpointUrl"
              placeholder="https://your-api.com/webhook"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signingSecret">Signing Secret (Optional)</Label>
            <Input
              id="signingSecret"
              type="password"
              placeholder="Paste your signing secret here"
              value={signingSecret}
              onChange={(e) => setSigningSecret(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!endpointUrl || isConnecting}>
            {isConnecting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
