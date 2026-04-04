import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Shield } from "lucide-react";

interface ConnectIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: { name: string; icon: string; description: string } | null;
}

export function ConnectIntegrationDialog({ open, onOpenChange, integration }: ConnectIntegrationDialogProps) {
  if (!integration) return null;

  const isOAuth = ["HubSpot", "Salesforce", "Slack", "Zapier"].includes(integration.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{integration.icon}</span>
            <div>
              <DialogTitle>{integration.name}</DialogTitle>
              <DialogDescription>{integration.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isOAuth ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-center space-y-3">
              <Shield className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm">You'll be redirected to {integration.name} to authorize access.</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {["Read contacts", "Write contacts", "Read deals", "Webhooks"].map((scope) => (
                  <Badge key={scope} variant="secondary" className="text-xs">{scope}</Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {integration.name === "Custom Webhooks" ? (
              <>
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input placeholder="https://api.example.com/webhooks" />
                </div>
                <div className="space-y-2">
                  <Label>Signing Secret <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input placeholder="whsec_..." type="password" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input placeholder="Enter your API key" type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Workspace URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input placeholder="https://yourworkspace.make.com" />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>
            {isOAuth ? (
              <>Connect with {integration.name} <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></>
            ) : (
              "Save & Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
