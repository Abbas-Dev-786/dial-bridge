import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteTeamMemberDialog({ open, onOpenChange }: InviteTeamMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Invite Team Member</DialogTitle>
          <DialogDescription className="text-center">Send an invitation to collaborate on your workspace.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input placeholder="colleague@company.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select defaultValue="editor">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — Full access</SelectItem>
                <SelectItem value="editor">Editor — Create & edit</SelectItem>
                <SelectItem value="viewer">Viewer — Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Personal Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="Hey, join our workspace!" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>Send Invitation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
