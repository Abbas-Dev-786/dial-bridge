import { useState } from "react";
import { DataTable, Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";

const auditEvents = [
  { id: "1", timestamp: "2025-03-06 14:32:05", actor: "Alex Thompson", action: "campaign.created", resourceType: "campaign", resourceId: "camp_q1outreach", diff: '{"name":"Q1 Outreach","status":"draft"}' },
  { id: "2", timestamp: "2025-03-06 14:28:12", actor: "Alex Thompson", action: "agent.updated", resourceType: "agent", resourceId: "agt_salesbot", diff: '{"temperature":{"from":0.7,"to":0.8}}' },
  { id: "3", timestamp: "2025-03-06 13:55:40", actor: "Sarah Kim", action: "contact.imported", resourceType: "contact", resourceId: "batch_1247", diff: '{"count":1247,"source":"csv"}' },
  { id: "4", timestamp: "2025-03-06 12:10:33", actor: "System", action: "kb.synced", resourceType: "knowledge_base", resourceId: "kb_prodoverview", diff: '{"status":"synced","documents":4}' },
  { id: "5", timestamp: "2025-03-05 18:45:21", actor: "Alex Thompson", action: "campaign.status_changed", resourceType: "campaign", resourceId: "camp_q1outreach", diff: '{"status":{"from":"draft","to":"live"}}' },
  { id: "6", timestamp: "2025-03-05 16:22:09", actor: "Mike Chen", action: "phone.imported", resourceType: "phone_number", resourceId: "pn_5551002000", diff: '{"number":"+1 (555) 100-2000","provider":"elevenlabs"}' },
  { id: "7", timestamp: "2025-03-05 14:05:17", actor: "Alex Thompson", action: "workspace.updated", resourceType: "workspace", resourceId: "ws_acme", diff: '{"timezone":{"from":"UTC","to":"US/Eastern"}}' },
  { id: "8", timestamp: "2025-03-04 10:30:55", actor: "System", action: "campaign.completed", resourceType: "campaign", resourceId: "camp_survey", diff: '{"contacts_called":842,"duration":"7d"}' },
];

const actionColors: Record<string, string> = {
  created: "bg-success/10 text-success",
  updated: "bg-primary/10 text-primary",
  imported: "bg-primary/10 text-primary",
  synced: "bg-success/10 text-success",
  status_changed: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  deleted: "bg-destructive/10 text-destructive",
};

export default function AuditLogs() {
  const [resourceFilter, setResourceFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = resourceFilter === "all" ? auditEvents : auditEvents.filter(e => e.resourceType === resourceFilter);

  const getActionColor = (action: string) => {
    const key = action.split(".")[1] || "";
    return actionColors[key] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all changes and actions in your workspace</p>
        </div>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All resources" />
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
      </div>

      <div className="rounded-xl border shadow-sm">
        {filtered.map((event) => (
          <div key={event.id} className="border-b last:border-b-0">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
            >
              {expandedId === event.id ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs font-mono text-muted-foreground w-36 shrink-0 hidden sm:block">{event.timestamp}</span>
              <span className="text-sm w-28 shrink-0">{event.actor}</span>
              <Badge variant="secondary" className={`text-xs font-mono ${getActionColor(event.action)}`}>
                {event.action}
              </Badge>
              <span className="flex-1" />
              <Badge variant="secondary" className="text-xs capitalize hidden sm:inline-flex">{event.resourceType.replace("_", " ")}</Badge>
              <span className="text-xs font-mono text-muted-foreground hidden lg:block">{event.resourceId}</span>
            </button>
            {expandedId === event.id && (
              <div className="px-4 pb-3 pl-12">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Changes (diff)</p>
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(JSON.parse(event.diff), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filtered.length} events</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
