import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Upload, UserPlus, Edit, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Ban, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useContactsQuery, useCampaignMutations } from "@/hooks/api/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DataTable, Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";

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
    setDialogState,
  } = useCampaignStore();

  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", email: "", company: "" });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const params: any = { page, page_size: pageSize };
  if (contactSearch) params.search = contactSearch;
  if (contactStatusFilter !== "all") params.status = [contactStatusFilter];

  const { data: contactsData = { items: [], total: 0 } } = useContactsQuery(id, params);
  const { updateContact, deleteContact } = useCampaignMutations(id);

  const handleEdit = (contact: any) => {
    setEditingContactId(contact.id);
    setEditForm({ 
      full_name: contact.full_name, 
      phone: contact.phone, 
      email: contact.email || "", 
      company: contact.company || "" 
    });
  };

  const handleSave = (contactId: string) => {
    if (!id) return;
    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    updateContact.mutate({ contactId, data: editForm }, {
      onSuccess: () => {
        setEditingContactId(null);
        toast({ title: "Contact updated" });
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" })
    });
  };

  const handleDelete = (contactId: string) => {
    if (!id) return;
    deleteContact.mutate(contactId, {
      onSuccess: () => toast({ title: "Contact deleted" }),
      onError: () => toast({ title: "Delete failed", variant: "destructive" })
    });
  };

  const handleMarkDNC = (contactId: string) => {
    if (!id) return;
    updateContact.mutate({ contactId, data: { is_dnc: true } }, {
      onSuccess: () => toast({ title: "Contact marked as DNC" }),
      onError: () => toast({ title: "Operation failed", variant: "destructive" })
    });
  };

  const changePage = (newPage: number) => {
    setPage(newPage);
  };

  const columns: Column<any>[] = [
    {
      key: "full_name",
      label: "Name",
      render: (r) => editingContactId === r.id ? (
        <Input className="h-8 text-sm" value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
      ) : (
        <span className="font-medium">{r.full_name}</span>
      )
    },
    {
      key: "phone",
      label: "Phone",
      hideOnMobile: true,
      render: (r) => editingContactId === r.id ? (
        <Input className="h-8 text-sm font-mono" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
      ) : (
        <span className="font-mono text-xs">{r.phone}</span>
      )
    },
    {
      key: "status",
      label: "Status",
      hideOnMobile: true,
      render: (r) => (
        <Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[r.status])}>
          {r.status === "do_not_call" ? "DNC" : r.status.replace("_", " ")}
        </Badge>
      )
    },
    {
      key: "next_retry_at",
      label: "Next Retry",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.status === "failed" && r.next_retry_at ? format(new Date(r.next_retry_at), "MMM d, HH:mm") : "-"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {editingContactId === r.id ? (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSave(r.id)}>
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingContactId(null)}>
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              {!r.is_dnc && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-warning" onClick={() => handleMarkDNC(r.id)}>
                  <Ban className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

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

      {contactsData.items.length > 0 ? (
        <DataTable
          columns={columns}
          data={contactsData.items}
          page={page}
          pageSize={pageSize}
          totalCount={contactsData.total}
          onPageChange={changePage}
          className="border rounded-xl shadow-sm overflow-hidden"
        />
      ) : (
        <EmptyState 
          icon={PhoneCall} 
          title="No contacts found" 
          description="Upload a CSV or add contacts manually to start calling." 
        />
      )}
    </div>
  );
}
