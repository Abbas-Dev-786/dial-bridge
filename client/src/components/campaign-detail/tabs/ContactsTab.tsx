import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Upload, UserPlus, Edit, Ban, Trash2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useToast } from "@/hooks/use-toast";

type ContactStatus = "pending" | "calling" | "called" | "failed" | "opted_out" | "do_not_call";

const contactStatusColors: Record<ContactStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  calling: "bg-primary/10 text-primary",
  called: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  opted_out: "bg-warning/10 text-warning",
  do_not_call: "bg-destructive/10 text-destructive",
};

export function ContactsTab() {
  const { toast } = useToast();
  const { contacts, setContacts, setDialogState } = useCampaignStore();
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", company: "" });

  const filteredContacts = contacts
    .filter(c => contactStatusFilter === "all" || c.status === contactStatusFilter)
    .filter(c => 
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
      c.phone.includes(contactSearch) || 
      c.email.toLowerCase().includes(contactSearch.toLowerCase())
    );

  const handleEdit = (contact: any) => {
    setEditingContactId(contact.id);
    setEditForm({ name: contact.name, phone: contact.phone, email: contact.email, company: contact.company });
  };

  const handleSave = (id: string) => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    setContacts(contacts.map(c => c.id === id ? { ...c, ...editForm } : c));
    setEditingContactId(null);
    toast({ title: "Contact updated" });
  };

  const handleDelete = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
    toast({ title: "Contact deleted" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contact List</h2>
          <p className="text-sm text-muted-foreground">{contacts.length} contacts loaded</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialogState("export", true)}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDialogState("importContacts", true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setDialogState("addContact", true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {([
          { label: "Total", value: contacts.length, color: "" },
          { label: "Pending", value: contacts.filter(c => c.status === "pending").length, color: "text-muted-foreground" },
          { label: "Called", value: contacts.filter(c => c.status === "called").length, color: "text-success" },
          { label: "Failed", value: contacts.filter(c => c.status === "failed").length, color: "text-destructive" },
          { label: "Opted Out", value: contacts.filter(c => c.status === "opted_out").length, color: "text-warning" },
          { label: "DNC", value: contacts.filter(c => c.status === "do_not_call").length, color: "text-destructive" },
        ]).map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "pending", "calling", "called", "failed", "opted_out", "do_not_call"].map((s) => (
            <Badge
              key={s}
              variant={contactStatusFilter === s ? "default" : "secondary"}
              className="cursor-pointer text-xs capitalize"
              onClick={() => setContactStatusFilter(s)}
            >
              {s === "all" ? "All" : s === "do_not_call" ? "DNC" : s.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Name</TableHead>
              <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider">Phone</TableHead>
              <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider">Email</TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider">Company</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow key={contact.id} className="transition-colors hover:bg-accent/50">
                {editingContactId === contact.id ? (
                  <>
                    <TableCell><Input className="h-8 text-sm" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Input className="h-8 text-sm font-mono" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></TableCell>
                    <TableCell className="hidden md:table-cell"><Input className="h-8 text-sm" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Input className="h-8 text-sm" value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} /></TableCell>
                    <TableCell><Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[contact.status as ContactStatus])}>{contact.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(contact.id)}>
                          <CheckCircle className="h-3.5 w-3.5 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingContactId(null)}>
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell><span className="font-medium">{contact.name}</span></TableCell>
                    <TableCell className="hidden sm:table-cell"><span className="font-mono text-xs">{contact.phone}</span></TableCell>
                    <TableCell className="hidden md:table-cell"><span className="text-xs text-muted-foreground">{contact.email}</span></TableCell>
                    <TableCell className="hidden lg:table-cell"><span className="text-xs">{contact.company}</span></TableCell>
                    <TableCell><Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[contact.status as ContactStatus])}>{contact.status === "do_not_call" ? "DNC" : contact.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(contact)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(contact.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
