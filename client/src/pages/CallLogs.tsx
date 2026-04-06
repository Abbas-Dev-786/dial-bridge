import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Download, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { workspaceRequest } from "@/lib/api";
import { formatCentsToDollars, formatSecondsToDuration, formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CallListItem {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  agent_name: string | null;
  campaign_name: string | null;
  direction: string;
  status: any;
  duration_seconds: number | null;
  total_cost_cents: number;
  created_at: string;
}

const columns: Column<CallListItem>[] = [
  { 
    key: "contact_phone", 
    label: "Contact", 
    sortable: true, 
    render: (r) => (
      <div className="flex flex-col">
        <span className="font-mono text-sm">{r.contact_phone}</span>
        {r.contact_name && <span className="text-[10px] text-muted-foreground">{r.contact_name}</span>}
      </div>
    ) 
  },
  { key: "agent_name", label: "Agent", sortable: true, hideOnMobile: true },
  { 
    key: "campaign_name", 
    label: "Campaign", 
    hideOnMobile: true, 
    render: (r) => <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">{r.campaign_name || "—"}</Badge> 
  },
  { key: "direction", label: "Direction", hideOnMobile: true },
  { 
    key: "duration_seconds", 
    label: "Duration", 
    sortable: true, 
    hideOnMobile: true, 
    render: (r) => <span className="font-mono text-sm">{formatSecondsToDuration(r.duration_seconds || 0)}</span> 
  },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { 
    key: "total_cost_cents", 
    label: "Cost", 
    sortable: true, 
    hideOnMobile: true, 
    render: (r) => <span className="font-mono text-sm">{formatCentsToDollars(r.total_cost_cents)}</span> 
  },
  { 
    key: "created_at", 
    label: "Date", 
    sortable: true, 
    hideOnMobile: true, 
    render: (r) => <span className="whitespace-nowrap">{formatDate(r.created_at)}</span> 
  },
];

export default function CallLogs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exportOpen, setExportOpen] = useState(false);
  const [calls, setCalls] = useState<CallListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const page = parseInt(searchParams.get("page") || "1");
  const campaignId = searchParams.get("campaign_id") || "all";
  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [page, campaignId, statusFilter]);

  const fetchCampaigns = async () => {
    try {
      const res = await workspaceRequest.get<any[]>("/campaigns");
      setCampaigns(res.data);
    } catch (error) {
      console.error("Failed to fetch campaigns", error);
    }
  };

  const fetchCalls = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        page_size: 20,
      };
      if (campaignId !== "all") params.campaign_id = campaignId;
      if (statusFilter !== "all") params.status = [statusFilter];

      const res = await workspaceRequest.get<{ items: CallListItem[]; total: number }>("/calls", { params });
      setCalls(res.data.items);
      setTotal(res.data.total);
    } catch (error) {
      console.error("Failed to fetch calls", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    searchParams.set("page", newPage.toString());
    setSearchParams(searchParams);
  };

  const handleFilterChange = (key: string, value: string) => {
    if (value === "all") {
      searchParams.delete(key);
    } else {
      searchParams.set(key, value);
    }
    searchParams.set("page", "1"); // Reset to page 1 on filter change
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
          <p className="text-sm text-muted-foreground">All ElevenLabs conversation records. Click to view transcripts, costs, and evaluations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/30 p-3 rounded-lg border">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          <Filter className="h-3 w-3" /> Filters
        </div>
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Select value={campaignId} onValueChange={(v) => handleFilterChange("campaign_id", v)}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => handleFilterChange("status", v)}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center border rounded-xl bg-card shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading calls...</p>
          </div>
        </div>
      ) : calls.length > 0 ? (
        <div className="space-y-4">
          <DataTable 
            columns={columns} 
            data={calls} 
            searchKey="contact_phone" 
            searchPlaceholder="Search phone numbers..." 
            onRowClick={(r) => navigate(`/calls/${r.id}`)}
            page={page}
            pageSize={20}
            totalCount={total}
            onPageChange={handlePageChange}
          />
        </div>
      ) : (
        <EmptyState icon={PhoneCall} title="No calls found" description="Adjust your filters or start a campaign to see call logs." />
      )}

      <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} title="Export Call Logs" description="Download call records in your preferred format." />
    </div>
  );
}
