import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { workspaceRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ConnectApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: { key: string; display_name: string } | null;
  onConnected: () => void;
}

export function ConnectApiKeyModal({ open, onOpenChange, provider, onConnected }: ConnectApiKeyModalProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!provider) return;
    setIsConnecting(true);
    try {
      await workspaceRequest.post(`/integrations/${provider.key}/connect-api-key`, {
        api_key: apiKey
      });
      toast({
        title: "Integration Connected",
        description: `Successfully connected ${provider.display_name}.`,
      });
      onConnected();
      onOpenChange(false);
      setApiKey("");
    } catch (error) {
      console.error("Connection failed", error);
      toast({
        title: "Connection Failed",
        description: "Please check your API key and try again.",
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
            Enter your API key to authorize the integration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!apiKey || isConnecting}>
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
