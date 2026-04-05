import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Upload, UserPlus, Edit, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type ContactStatus = "pending" | "calling" | "called" | "failed" | "opted_out" | "do_not_call";

const contactStatusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  calling: "bg-primary/10 text-primary",
  called: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  opted_out: "bg-warning/10 text-warning",
  do_not_call: "bg-destructive/10 text-destructive",
};

export function ContactsTab() {
  const { id } = useParams();
  const { toast } = useToast();
  const { 
    contactsData, 
    fetchContacts, 
    addContact, 
    updateContact, 
    deleteContact, 
    setDialogState,
    activeCampaign
  } = useCampaignStore();

  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", email: "", company: "" });

  useEffect(() => {
    if (id) {
      const params: any = {
        page: contactsData.page,
        page_size: contactsData.page_size,
      };
      if (contactSearch) params.search = contactSearch;
      if (contactStatusFilter !== "all") params.status = [contactStatusFilter];
      fetchContacts(id, params);
    }
  }, [id, contactSearch, contactStatusFilter, contactsData.page, contactsData.page_size, fetchContacts]);

  const handleEdit = (contact: any) => {
    setEditingContactId(contact.id);
    setEditForm({ 
      full_name: contact.full_name, 
      phone: contact.phone, 
      email: contact.email || "", 
      company: contact.company || "" 
    });
  };

  const handleSave = async (contactId: string) => {
    if (!id) return;
    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    try {
      await updateContact(id, contactId, editForm);
      setEditingContactId(null);
      toast({ title: "Contact updated" });
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!id) return;
    try {
      await deleteContact(id, contactId);
      toast({ title: "Contact deleted" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleMarkDNC = async (contactId: string) => {
    if (!id) return;
    try {
      await updateContact(id, contactId, { is_dnc: true });
      toast({ title: "Contact marked as DNC" });
    } catch (error) {
      toast({ title: "Operation failed", variant: "destructive" });
    }
  };

  const setPage = (page: number) => {
    if (!id) return;
    fetchContacts(id, { page, page_size: contactsData.page_size, search: contactSearch, status: contactStatusFilter !== "all" ? [contactStatusFilter] : undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contact List</h2>
          <p className="text-sm text-muted-foreground">{contactsData.total} contacts total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialogState("importContacts", true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setDialogState("addContact", true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Contact
          </Button>
        </div>
      </div>

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

      <div className="rounded-xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Name</TableHead>
              <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider">Phone</TableHead>
              <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider">Next Retry</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactsData.items.map((contact) => (
              <TableRow key={contact.id} className="transition-colors hover:bg-accent/50">
                {editingContactId === contact.id ? (
                  <>
                    <TableCell><Input className="h-8 text-sm" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Input className="h-8 text-sm font-mono" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></TableCell>
                    <TableCell><Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[contact.status])}>{contact.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell">-</TableCell>
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
                    <TableCell><span className="font-medium">{contact.full_name}</span></TableCell>
                    <TableCell className="hidden sm:table-cell"><span className="font-mono text-xs">{contact.phone}</span></TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[contact.status])}>{contact.status === "do_not_call" ? "DNC" : contact.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {contact.status === "failed" && contact.next_retry_at ? format(new Date(contact.next_retry_at), "MMM d, HH:mm") : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(contact)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {!contact.is_dnc && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-warning" onClick={() => handleMarkDNC(contact.id)}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
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

      {contactsData.total > contactsData.page_size && (
        <div className="flex items-center justify-between py-4">
          <p className="text-xs text-muted-foreground">
            Showing {(contactsData.page - 1) * contactsData.page_size + 1} to {Math.min(contactsData.page * contactsData.page_size, contactsData.total)} of {contactsData.total}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={contactsData.page <= 1}
              onClick={() => setPage(contactsData.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!contactsData.has_next}
              onClick={() => setPage(contactsData.page + 1)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
