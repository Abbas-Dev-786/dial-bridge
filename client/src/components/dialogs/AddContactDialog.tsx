import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (contact: { full_name: string; phone: string; email: string; company: string; notes: string }) => void;
}

export function AddContactDialog({ open, onOpenChange, onAdd }: AddContactDialogProps) {
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", company: "", notes: "" });

  const handleSubmit = () => {
    if (!form.full_name.trim() || !form.phone.trim()) return;
    onAdd?.(form);
    setForm({ full_name: "", phone: "", email: "", company: "", notes: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Add a single contact to this campaign.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Full Name *</Label>
            <Input placeholder="John Doe" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone *</Label>
            <Input placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input placeholder="john@example.com" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Company</Label>
            <Input placeholder="Acme Corp" value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Any additional notes..." rows={2} value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.full_name.trim() || !form.phone.trim()}>Add Contact</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
