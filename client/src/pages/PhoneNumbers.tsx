import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Plus, Download, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportSIPDialog } from "@/components/dialogs/ImportSIPDialog";
import { ImportElevenLabsNumberDialog } from "@/components/dialogs/ImportElevenLabsNumberDialog";
import { useToast } from "@/hooks/use-toast";
import { workspaceRequest } from "@/lib/api";

interface PhoneNumberListItem {
  id: string;
  number: string;
  friendly_name: string | null;
  provider: string;
  active_campaign_name: string | null;
  number_type: string;
  calls_made: number;
  status: any;
}

const columns: Column<PhoneNumberListItem>[] = [
  { 
    key: "number", 
    label: "Number", 
    render: (r) => <span className="font-mono text-sm font-medium">{r.number}</span> 
  },
  { 
    key: "friendly_name", 
    label: "Label",
    render: (r) => <span>{r.friendly_name || "—"}</span>
  },
  { 
    key: "provider", 
    label: "Provider", 
    hideOnMobile: true, 
    render: (r) => (
      <Badge variant="secondary" className="text-xs font-normal capitalize">
        {r.provider.replace("_", " ")}
      </Badge>
    )
  },
  { 
    key: "active_campaign_name", 
    label: "Assigned Campaign", 
    hideOnMobile: true, 
    render: (r) => (
      r.active_campaign_name
        ? <Badge variant="default" className="text-xs font-normal bg-success/10 text-success border-0">Active · {r.active_campaign_name}</Badge>
        : <span className="text-sm text-muted-foreground">Available</span>
    )
  },
  { 
    key: "number_type", 
    label: "Type", 
    hideOnMobile: true, 
    render: (r) => <Badge variant="secondary" className="capitalize">{r.number_type.replace("_", " ")}</Badge> 
  },
  { key: "calls_made", label: "Calls", hideOnMobile: true, sortable: true },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function PhoneNumbers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [numbers, setNumbers] = useState<PhoneNumberListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sipDialogOpen, setSipDialogOpen] = useState(false);
  const [elDialogOpen, setElDialogOpen] = useState(false);

  const fetchNumbers = async () => {
    setIsLoading(true);
    try {
      const res = await workspaceRequest.get<PhoneNumberListItem[]>("/phone-numbers");
      setNumbers(res.data);
    } catch (error) {
      console.error("Failed to fetch phone numbers", error);
      toast({
        title: "Error",
        description: "Failed to load phone numbers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phone Numbers</h1>
          <p className="text-sm text-muted-foreground">Manage phone numbers for ElevenLabs telephony. Import from ElevenLabs, Twilio, or connect via SIP.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setElDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Import from ElevenLabs
          </Button>
          <Button variant="outline" onClick={() => setSipDialogOpen(true)}>
            Import SIP Trunk
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Buy Number (Twilio)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Numbers</TabsTrigger>
          <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
          <TabsTrigger value="twilio">Twilio</TabsTrigger>
          <TabsTrigger value="sip">SIP Trunks</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center border rounded-xl bg-card shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : numbers.length > 0 ? (
            <DataTable columns={columns} data={numbers} searchKey="number" searchPlaceholder="Search numbers..." />
          ) : (
            <EmptyState icon={Phone} title="No phone numbers" description="Import from ElevenLabs, Twilio, or connect a SIP trunk to get started." actionLabel="Import from ElevenLabs" onAction={() => setElDialogOpen(true)} />
          )}
        </TabsContent>

        <TabsContent value="elevenlabs" className="mt-4">
          <DataTable columns={columns} data={numbers.filter((n) => n.provider === "elevenlabs")} searchKey="number" searchPlaceholder="Search ElevenLabs numbers..." />
        </TabsContent>

        <TabsContent value="twilio" className="mt-4">
          <DataTable columns={columns} data={numbers.filter((n) => n.provider === "twilio")} searchKey="number" searchPlaceholder="Search Twilio numbers..." />
        </TabsContent>

        <TabsContent value="sip" className="mt-4">
          <DataTable columns={columns} data={numbers.filter((n) => n.provider === "sip_trunk")} searchKey="number" searchPlaceholder="Search SIP trunks..." />
        </TabsContent>
      </Tabs>

      <ImportSIPDialog open={sipDialogOpen} onOpenChange={setSipDialogOpen} />
      <ImportElevenLabsNumberDialog
        open={elDialogOpen}
        onOpenChange={setElDialogOpen}
        onImported={(count) => {
          toast({ title: "Numbers imported", description: `${count} phone number${count !== 1 ? "s" : ""} imported from ElevenLabs.` });
          fetchNumbers();
        }}
      />
    </div>
  );
}
