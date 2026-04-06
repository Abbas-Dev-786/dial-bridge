import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMemberMutations } from "@/hooks/api/useSettings";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteTeamMemberDialog({ open, onOpenChange, onSuccess }: InviteTeamMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  
  const { inviteMember } = useMemberMutations();
  const isInviting = inviteMember.isPending;

  const handleInvite = () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    
    inviteMember.mutate({ email, role }, {
      onSuccess: () => {
        toast.success("Invitation sent successfully");
        setEmail("");
        setRole("viewer");
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err: any) => {
        console.error(err);
        toast.error(err.response?.data?.detail || "Failed to send invitation");
      }
    });
  };

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

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input 
              placeholder="colleague@company.com" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isInviting}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole} disabled={isInviting}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — Full access</SelectItem>
                <SelectItem value="editor">Editor — Create & edit</SelectItem>
                <SelectItem value="viewer">Viewer — Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isInviting}>Cancel</Button>
          <Button onClick={handleInvite} disabled={isInviting}>
            {isInviting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
