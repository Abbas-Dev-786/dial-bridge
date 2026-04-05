import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, ShieldCheck, Shield, User } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/dialogs/InviteTeamMemberDialog";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { workspaceRequest } from "@/lib/api";
import { toast } from "sonner";

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  role: string;
  accepted_at: string | null;
  created_at: string;
}

export default function SettingsTeam() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const res = await workspaceRequest.get<Member[]>("/members");
      setMembers(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRemove = async () => {
    if (!deleteTarget) return;
    try {
      await workspaceRequest.delete(`/members/${deleteTarget.user.id}`);
      toast.success("Member removed");
      setMembers(prev => prev.filter(m => m.user.id !== deleteTarget.user.id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove member");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await workspaceRequest.patch(`/members/${userId}`, { role: newRole });
      toast.success("Role updated");
      setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <ShieldCheck className="h-3.5 w-3.5 text-premium-600" />;
      case 'admin': return <Shield className="h-3.5 w-3.5 text-blue-600" />;
      default: return <User className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 p-0">
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      <div className="grid gap-3">
        {members.map((m) => (
          <div key={m.user.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold uppercase">
                {m.user.full_name ? m.user.full_name.charAt(0) : m.user.email.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{m.user.full_name || "Invited User"}</p>
                {!m.accepted_at && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-4 bg-muted text-muted-foreground">Pending</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/40">
                {getRoleIcon(m.role)}
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.role}</span>
              </div>

              <Select value={m.role} onValueChange={(val) => handleUpdateRole(m.user.id, val)} disabled={m.role === 'owner'}>
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>

              {m.role !== 'owner' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                  onClick={() => setDeleteTarget(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <InviteTeamMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onSuccess={loadMembers} />
      
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${deleteTarget?.user.full_name || deleteTarget?.user.email} from the team? They will lose access immediately.`}
        onConfirm={handleRemove}
      />
    </div>
  );
}
