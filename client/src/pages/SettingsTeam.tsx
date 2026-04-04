import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2 } from "lucide-react";
import { InviteTeamMemberDialog } from "@/components/dialogs/InviteTeamMemberDialog";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";

const members = [
  { name: "John Doe", email: "john@acme.com", role: "Admin", initials: "JD" },
  { name: "Sarah Chen", email: "sarah@acme.com", role: "Editor", initials: "SC" },
  { name: "Mike Wilson", email: "mike@acme.com", role: "Viewer", initials: "MW" },
];

export default function SettingsTeam() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team & Members</h1>
          <p className="text-sm text-muted-foreground">Manage team access</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}><Plus className="mr-2 h-4 w-4" /> Invite Member</Button>
      </div>

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.email} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{m.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-muted-foreground truncate">{m.email}</p>
            </div>
            <Badge variant="secondary">{m.role}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(m.name)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <InviteTeamMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${deleteTarget} from the team? They will lose access immediately.`}
        onConfirm={() => setDeleteTarget(null)}
      />
    </div>
  );
}
