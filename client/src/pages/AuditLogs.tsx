import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  History,
  User as UserIcon,
  Calendar,
} from "lucide-react";
import { workspaceRequest } from "@/lib/api";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { DatePickerWithRange } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { DataTable, Column } from "@/components/shared/DataTable";

interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  diff: any;
  created_at: string;
}

interface Member {
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [resourceFilter, setResourceFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [members, setMembers] = useState<Member[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch members to resolve actor names
  useEffect(() => {
    workspaceRequest
      .get<Member[]>("/members")
      .then((res) => {
        setMembers(res.data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load team members");
      });
  }, []);

  const fetchParams = useMemo(
    () => ({
      resource_type: resourceFilter === "all" ? undefined : resourceFilter,
      actor_user_id: actorFilter === "all" ? undefined : actorFilter,
      date_from: dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : undefined,
      date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
      page,
      page_size: 20,
    }),
    [resourceFilter, actorFilter, dateRange, page],
  );

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const res = await workspaceRequest.get<{
          items: AuditLog[];
          total: number;
          has_next: boolean;
        }>("/audit-logs", {
          params: fetchParams,
        });
        setLogs(res.data.items);
        setTotal(res.data.total);
        setHasNext(res.data.has_next);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, [fetchParams]);

  const getActorName = (actorId: string | null, actorType: string) => {
    if (actorType === "system") return "System";
    const member = members.find((m) => m.user.id === actorId);
    return member?.user.full_name || "Unknown User";
  };

  const getActionColor = (action: string) => {
    if (action.includes("created"))
      return "bg-success/10 text-success border-success/20";
    if (action.includes("updated"))
      return "bg-primary/10 text-primary border-primary/20";
    if (action.includes("deleted"))
      return "bg-destructive/10 text-destructive border-destructive/20";
    if (action.includes("failed"))
      return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-muted text-muted-foreground border-muted-foreground/20";
  };

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      render: (r) => (
        <span className="text-[10px] font-mono text-muted-foreground">
          {new Date(r.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actor_user_id",
      label: "Actor",
      render: (r) => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-semibold truncate">
            {getActorName(r.actor_user_id, r.actor_type)}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <Badge
          variant="outline"
          className={`text-[10px] font-mono uppercase px-1.5 h-5 ${getActionColor(r.action)}`}
        >
          {r.action.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "resource_type",
      label: "Resource",
      hideOnMobile: true,
      render: (r) => (
        <Badge
          variant="secondary"
          className="text-[10px] font-bold h-5 px-1.5 capitalize border-none bg-muted/50"
        >
          {r.resource_type.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "resource_id",
      label: "ID",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[10px] font-mono text-muted-foreground opacity-40 select-all">
          {r.resource_id}
        </span>
      ),
    },
  ];

  const renderExpandedRow = (event: AuditLog) => (
    <div className="p-4 ml-8 mr-4">
      <div className="rounded-lg bg-muted/50 border p-4 space-y-3">
        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
          <span>Audit Details</span>
          <span className="font-mono opacity-50">ID: {event.id}</span>
        </div>
        {event.diff && Object.keys(event.diff).length > 0 ? (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-2">
              CHANGES
            </p>
            <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap break-all bg-card p-3 rounded border">
              {JSON.stringify(event.diff, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-[10px] italic text-muted-foreground text-center py-2">
            No data detail for this event.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-xs text-muted-foreground">
            Track all changes and actions in your workspace
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={resourceFilter}
            onValueChange={(v) => {
              setResourceFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="campaign">Campaigns</SelectItem>
              <SelectItem value="agent">Agents</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="phone_number">Phone Numbers</SelectItem>
              <SelectItem value="knowledge_base">Knowledge Base</SelectItem>
              <SelectItem value="workspace">Workspace</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={actorFilter}
            onValueChange={(v) => {
              setActorFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actors</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user.id} value={m.user.id}>
                  {m.user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePickerWithRange
            date={dateRange}
            setDate={(d) => {
              setDateRange(d);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No audit events found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            expandableRowRender={renderExpandedRow}
            page={page}
            pageSize={20}
            totalCount={total}
            onPageChange={setPage}
            className="border-none shadow-none space-y-0"
          />
        )}
      </div>
    </div>
  );
}
