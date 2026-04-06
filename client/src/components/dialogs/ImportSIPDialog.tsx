import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server, Loader2 } from "lucide-react";
import { usePhoneNumberMutations } from "@/hooks/api/usePhoneNumbers";
import { useToast } from "@/hooks/use-toast";

interface ImportSIPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportSIPDialog({ open, onOpenChange }: ImportSIPDialogProps) {
  const { toast } = useToast();
  const { importSIPTrunk } = usePhoneNumberMutations();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    friendly_name: "",
    sip_server: "",
    sip_username: "",
    sip_password: "",
    sip_port: 5060,
  });

  const handleImport = () => {
    setLoading(true);
    importSIPTrunk.mutate(formData, {
      onSuccess: () => {
        toast({ title: "SIP Trunk Connected", description: `Successfully imported ${formData.number}` });
        setLoading(false);
        onOpenChange(false);
      },
      onError: (err: any) => {
        setLoading(false);
        toast({ 
          title: "Import Failed", 
          description: err.response?.data?.detail || "Could not connect SIP trunk", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Import via SIP Trunk</DialogTitle>
          <DialogDescription className="text-center">Connect your existing SIP trunk to use your own numbers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number (E.164)</Label>
            <Input 
              placeholder="+15551234567" 
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Friendly Name (Optional)</Label>
            <Input 
              placeholder="My SIP Number" 
              value={formData.friendly_name}
              onChange={(e) => setFormData({ ...formData, friendly_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>SIP Server Address</Label>
            <Input 
              placeholder="sip.provider.com" 
              value={formData.sip_server}
              onChange={(e) => setFormData({ ...formData, sip_server: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input 
                placeholder="username" 
                value={formData.sip_username}
                onChange={(e) => setFormData({ ...formData, sip_username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={formData.sip_password}
                onChange={(e) => setFormData({ ...formData, sip_password: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input 
              placeholder="5060" 
              type="number"
              value={formData.sip_port}
              onChange={(e) => setFormData({ ...formData, sip_port: parseInt(e.target.value) || 5060 })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : "Connect SIP Trunk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
