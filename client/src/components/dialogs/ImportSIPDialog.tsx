import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server } from "lucide-react";

interface ImportSIPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportSIPDialog({ open, onOpenChange }: ImportSIPDialogProps) {
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
            <Label>SIP Server Address</Label>
            <Input placeholder="sip.provider.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input placeholder="username" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input placeholder="5060" defaultValue="5060" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number (E.164)</Label>
            <Input placeholder="+15551234567" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Connect SIP Trunk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
