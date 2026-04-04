import { useState, forwardRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, Column } from "@/components/DataTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { BuyPhoneNumberDialog } from "@/components/dialogs/BuyPhoneNumberDialog";
import { UploadDocumentDialog } from "@/components/dialogs/UploadDocumentDialog";
import { ConnectIntegrationDialog } from "@/components/dialogs/ConnectIntegrationDialog";
import { UploadContactsDialog } from "@/components/dialogs/UploadContactsDialog";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { AddContactDialog } from "@/components/dialogs/AddContactDialog";
import { ImportContactsDialog } from "@/components/dialogs/ImportContactsDialog";
import {
  ChevronLeft, Phone, CheckCircle, XCircle, Clock, Pause, Download, Play,
  Bot, FileText, Globe, Link2, Settings, Calendar, Users, TrendingUp,
  BarChart3, PhoneCall, PhoneOff, Voicemail, UserCheck, ArrowRight,
  BookOpen, Zap, Volume2, Copy, Edit, Hash, DollarSign, Activity,
  Plus, Trash2, Search, Upload, ExternalLink, File, UserPlus, Contact,
  AlertTriangle, Loader2, RefreshCw, Ban, Archive, CalendarCheck, PlayCircle,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

/* ── Mock Data ─────────────────────────────────────────── */

const campaignCalls = [
  { id: "c1", contact: "+1 (555) 101-0101", contactName: "Sarah Johnson", status: "live" as const, duration: "2:15", outcome: "Booked demo", sentiment: "Positive", time: "5 min ago", cost: "$0.12", agent: "Sales Bot Pro" },
  { id: "c2", contact: "+1 (555) 202-0202", contactName: "Mike Chen", status: "live" as const, duration: "3:42", outcome: "Interested", sentiment: "Positive", time: "12 min ago", cost: "$0.18", agent: "Sales Bot Pro" },
  { id: "c3", contact: "+1 (555) 303-0303", contactName: "Lisa Park", status: "error" as const, duration: "0:08", outcome: "No answer", sentiment: "—", time: "15 min ago", cost: "$0.02", agent: "Sales Bot Pro" },
  { id: "c4", contact: "+1 (555) 404-0404", contactName: "David Kim", status: "live" as const, duration: "1:55", outcome: "Not interested", sentiment: "Negative", time: "22 min ago", cost: "$0.09", agent: "Sales Bot Pro" },
  { id: "c5", contact: "+1 (555) 505-0505", contactName: "Emma Wilson", status: "paused" as const, duration: "—", outcome: "Pending", sentiment: "—", time: "Scheduled", cost: "—", agent: "Sales Bot Pro" },
  { id: "c6", contact: "+1 (555) 606-0606", contactName: "Tom Brown", status: "live" as const, duration: "4:12", outcome: "Booked demo", sentiment: "Positive", time: "30 min ago", cost: "$0.21", agent: "Sales Bot Pro" },
  { id: "c7", contact: "+1 (555) 707-0707", contactName: "Ana Garcia", status: "error" as const, duration: "0:03", outcome: "Busy", sentiment: "—", time: "35 min ago", cost: "$0.01", agent: "Sales Bot Pro" },
  { id: "c8", contact: "+1 (555) 808-0808", contactName: "James Lee", status: "live" as const, duration: "2:48", outcome: "Follow-up", sentiment: "Neutral", time: "42 min ago", cost: "$0.14", agent: "Sales Bot Pro" },
];

const callColumns: Column<typeof campaignCalls[0]>[] = [
  { key: "contactName", label: "Name", render: (r) => <span className="font-medium">{r.contactName}</span> },
  { key: "contact", label: "Number", hideOnMobile: true, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.contact}</span> },
  { key: "agent", label: "Agent", hideOnMobile: true, render: (r) => <span className="text-xs">{r.agent}</span> },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "duration", label: "Duration", hideOnMobile: true, render: (r) => <span className="font-mono text-sm">{r.duration}</span> },
  { key: "outcome", label: "Outcome", hideOnMobile: true, render: (r) => <Badge variant="secondary" className="text-xs font-normal">{r.outcome}</Badge> },
  { key: "cost", label: "Cost", hideOnMobile: true, render: (r) => <span className="font-mono text-xs">{r.cost}</span> },
];

const campaignAgent = {
  id: "1", name: "Sales Bot Pro", model: "GPT-4o", voice: "Nova", status: "live" as const, calls: 642, successRate: "72%",
};

type ContactStatus = "pending" | "calling" | "called" | "failed" | "opted_out" | "do_not_call";

const initialContacts: {
  id: string; name: string; phone: string; email: string; company: string;
  status: ContactStatus; outcome: string; lastCall: string; retryCount: number;
}[] = [
  { id: "1", name: "Sarah Johnson", phone: "+1 (555) 101-0101", email: "sarah@example.com", company: "Acme Inc", status: "called", outcome: "Booked demo", lastCall: "5 min ago", retryCount: 0 },
  { id: "2", name: "Mike Chen", phone: "+1 (555) 202-0202", email: "mike@example.com", company: "TechCorp", status: "called", outcome: "Interested", lastCall: "12 min ago", retryCount: 0 },
  { id: "3", name: "Lisa Park", phone: "+1 (555) 303-0303", email: "lisa@example.com", company: "StartupCo", status: "failed", outcome: "No answer", lastCall: "15 min ago", retryCount: 2 },
  { id: "4", name: "David Kim", phone: "+1 (555) 404-0404", email: "david@example.com", company: "BigCo", status: "called", outcome: "Not interested", lastCall: "22 min ago", retryCount: 0 },
  { id: "5", name: "Emma Wilson", phone: "+1 (555) 505-0505", email: "emma@example.com", company: "DesignLab", status: "pending", outcome: "—", lastCall: "—", retryCount: 0 },
  { id: "6", name: "Tom Brown", phone: "+1 (555) 606-0606", email: "tom@example.com", company: "MediaGroup", status: "called", outcome: "Booked demo", lastCall: "30 min ago", retryCount: 0 },
  { id: "7", name: "Rachel Green", phone: "+1 (555) 909-0909", email: "rachel@example.com", company: "ConsultCo", status: "do_not_call", outcome: "—", lastCall: "—", retryCount: 0 },
  { id: "8", name: "Carlos Lopez", phone: "+1 (555) 010-1010", email: "carlos@example.com", company: "FinServ", status: "opted_out", outcome: "—", lastCall: "1 hr ago", retryCount: 1 },
];

const assignedPhone = { id: "1", number: "+1 (555) 100-2000", label: "Primary Outbound", type: "Local", callsMade: 642, status: "live" as const };

const workspacePhones = [
  { id: "2", number: "+1 (555) 200-3000", label: "Backup Line", type: "Local", campaign: "—" },
  { id: "3", number: "+1 (555) 300-4000", label: "Support Line", type: "Toll-free", campaign: "Product Launch" },
  { id: "4", number: "+1 (800) 400-5000", label: "SIP Trunk", type: "SIP", campaign: "—" },
];

const knowledgeDocs = [
  { id: "1", name: "Product Overview 2024.pdf", type: "PDF", size: "2.4 MB", pages: 32, lastUpdated: "2 days ago" },
  { id: "2", name: "Pricing & Plans.pdf", type: "PDF", size: "850 KB", pages: 8, lastUpdated: "1 week ago" },
  { id: "3", name: "FAQ Database", type: "Web Scrape", size: "1.1 MB", pages: 156, lastUpdated: "3 days ago" },
  { id: "4", name: "Case Studies Collection", type: "PDF", size: "4.8 MB", pages: 45, lastUpdated: "5 days ago" },
];

const campaignIntegrations = [
  { id: "hubspot", name: "HubSpot", description: "Sync contacts and deals", icon: "🔶", enabled: true },
  { id: "salesforce", name: "Salesforce", description: "Log call outcomes to CRM", icon: "☁️", enabled: true },
  { id: "calendar", name: "Google Calendar", description: "Book demos in available slots", icon: "📅", enabled: true },
  { id: "slack", name: "Slack", description: "Demo booked notifications", icon: "💬", enabled: true },
  { id: "webhooks", name: "Custom Webhooks", description: "POST results to endpoint", icon: "🔗", enabled: true },
  { id: "zapier", name: "Zapier", description: "Automation workflows", icon: "⚡", enabled: false },
];

const volumeData = [
  { date: "Mon", calls: 180, success: 165, failed: 15 },
  { date: "Tue", calls: 220, success: 198, failed: 22 },
  { date: "Wed", calls: 195, success: 178, failed: 17 },
  { date: "Thu", calls: 260, success: 240, failed: 20 },
  { date: "Fri", calls: 240, success: 218, failed: 22 },
  { date: "Sat", calls: 90, success: 82, failed: 8 },
  { date: "Sun", calls: 65, success: 60, failed: 5 },
];

const costData = [
  { date: "Week 1", telephony: 42, ai: 85 },
  { date: "Week 2", telephony: 55, ai: 110 },
  { date: "Week 3", telephony: 48, ai: 95 },
  { date: "Week 4", telephony: 60, ai: 120 },
];

const pieData = [
  { name: "Booked Demo", value: 285, color: "hsl(152 69% 40%)" },
  { name: "Interested", value: 189, color: "hsl(210 80% 55%)" },
  { name: "Not Interested", value: 168, color: "hsl(38 92% 50%)" },
  { name: "No Answer", value: 142, color: "hsl(220 10% 46%)" },
  { name: "Voicemail", value: 58, color: "hsl(220 10% 70%)" },
];

const sentimentData = [
  { name: "Positive", value: 45, color: "hsl(152 69% 40%)" },
  { name: "Neutral", value: 32, color: "hsl(38 92% 50%)" },
  { name: "Negative", value: 15, color: "hsl(0 72% 51%)" },
  { name: "Unknown", value: 8, color: "hsl(220 10% 70%)" },
];

const latencyData = [
  { date: "Mon", p50: 180, p95: 420 },
  { date: "Tue", p50: 165, p95: 390 },
  { date: "Wed", p50: 190, p95: 450 },
  { date: "Thu", p50: 170, p95: 400 },
  { date: "Fri", p50: 155, p95: 370 },
  { date: "Sat", p50: 140, p95: 340 },
  { date: "Sun", p50: 135, p95: 330 },
];

const campaignSettings = {
  schedule: { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "9:00 AM", endTime: "5:00 PM", timezone: "US/Eastern" },
  retryPolicy: { maxRetries: 3, retryDelay: "30 min", retryOn: ["no_answer", "busy", "voicemail", "failed", "timeout"] },
  concurrency: 5,
  contactListSize: 1200,
  contactsRemaining: 358,
  createdAt: "Jan 15, 2025",
  lastModified: "Mar 6, 2025",
  owner: "Alex Thompson",
  startDate: "2025-03-10",
  endDate: "2025-04-10",
  callerIdDisplayName: "Acme Corporation",
};

/* ── Status Machine ────────────────────────────────────── */

type CampaignStatus = "draft" | "scheduled" | "live" | "paused" | "completed" | "archived";

const statusTransitions: Record<CampaignStatus, { label: string; icon: any; target: CampaignStatus; variant?: string }[]> = {
  draft: [
    { label: "Schedule", icon: CalendarCheck, target: "scheduled" },
    { label: "Launch Now", icon: PlayCircle, target: "live" },
  ],
  scheduled: [
    { label: "Launch Now", icon: PlayCircle, target: "live" },
    { label: "Back to Draft", icon: Edit, target: "draft" },
  ],
  live: [
    { label: "Pause", icon: Pause, target: "paused" },
    { label: "Complete", icon: StopCircle, target: "completed", variant: "outline" },
  ],
  paused: [
    { label: "Resume", icon: Play, target: "live" },
    { label: "Complete", icon: StopCircle, target: "completed", variant: "outline" },
  ],
  completed: [
    { label: "Archive", icon: Archive, target: "archived", variant: "outline" },
  ],
  archived: [],
};

/* ── Tabs ──────────────────────────────────────────────── */

const tabs = [
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "agents", label: "Agents", icon: Bot },
  { value: "contacts", label: "Contacts", icon: Users },
  { value: "calls", label: "Call Logs", icon: PhoneCall },
  { value: "phones", label: "Phone Numbers", icon: Phone },
  { value: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { value: "integrations", label: "Integrations", icon: Link2 },
  { value: "analytics", label: "Analytics", icon: TrendingUp },
  { value: "settings", label: "Settings", icon: Settings },
] as const;

/* ── Helpers ───────────────────────────────────────────── */

const InfoRow = forwardRef<HTMLDivElement, { label: string; value: string; mono?: boolean }>(
  ({ label, value, mono }, ref) => (
    <div ref={ref} className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", mono && "font-mono")}>{value}</span>
    </div>
  )
);
InfoRow.displayName = "InfoRow";

const contactStatusColors: Record<ContactStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  calling: "bg-primary/10 text-primary",
  called: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  opted_out: "bg-warning/10 text-warning",
  do_not_call: "bg-destructive/10 text-destructive",
};

/* ── Component ─────────────────────────────────────────── */

export default function CampaignDetail() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [buyNumberOpen, setBuyNumberOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [changeAgentOpen, setChangeAgentOpen] = useState(false);
  const [uploadContactsOpen, setUploadContactsOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [importContactsOpen, setImportContactsOpen] = useState(false);
  const [connectIntOpen, setConnectIntOpen] = useState(false);
  const [connectTarget, setConnectTarget] = useState<any>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<CampaignStatus | null>(null);
  const [compliance, setCompliance] = useState({
    dnc: true, record: true, tcpa: true, voicemailDetect: true, leaveVoicemail: false,
  });
  const [integrationToggles, setIntegrationToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(campaignIntegrations.map(i => [i.id, i.enabled]))
  );

  // Contact management state
  const [contacts, setContacts] = useState(initialContacts);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", company: "" });
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");

  const campaignData: Record<string, { name: string; status: CampaignStatus }> = {
    "1": { name: "Q1 Outreach", status: "live" },
    "2": { name: "Product Launch", status: "paused" },
    "3": { name: "Survey Q1", status: "draft" },
    "4": { name: "Re-engagement", status: "completed" },
  };
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>(
    campaignData[id || "1"]?.status || "draft"
  );
  const campaign = campaignData[id || "1"] || { name: `Campaign ${id}`, status: "draft" };
  const isDraft = campaignStatus === "draft";

  const outcomes = [
    { label: "Booked Demo", count: 285, pct: 34, icon: UserCheck, color: "text-success" },
    { label: "Interested", count: 189, pct: 22, icon: TrendingUp, color: "text-primary" },
    { label: "Not Interested", count: 168, pct: 20, icon: PhoneOff, color: "text-warning" },
    { label: "No Answer", count: 142, pct: 17, icon: PhoneCall, color: "text-muted-foreground" },
    { label: "Voicemail", count: 58, pct: 7, icon: Voicemail, color: "text-muted-foreground" },
  ];

  const filteredContacts = contacts
    .filter(c => contactStatusFilter === "all" || c.status === contactStatusFilter)
    .filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone.includes(contactSearch) || c.email.toLowerCase().includes(contactSearch.toLowerCase()));

  const handleStatusTransition = (target: CampaignStatus) => {
    setCampaignStatus(target);
    setStatusConfirm(null);
    toast({ title: "Campaign status updated", description: `Campaign is now ${target}.` });
  };

  const availableTransitions = statusTransitions[campaignStatus] || [];

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ──────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigate("/campaigns")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate("/campaigns")}>Campaigns</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{campaign.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <StatusBadge status={campaignStatus as any} />
          </div>
          <div className="flex gap-2">
            {availableTransitions.map((t) => (
              <Button
                key={t.target}
                variant={(t.variant as any) || "outline"}
                size="sm"
                onClick={() => {
                  if (t.target === "completed" || t.target === "archived") {
                    setStatusConfirm(t.target);
                  } else {
                    handleStatusTransition(t.target);
                  }
                }}
              >
                <t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {isDraft && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-warning font-medium flex-1">
              ⚠ Missing resources: Add contacts and a phone number to launch this campaign.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveTab("contacts")}>Add Contacts</Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("phones")}>Add Phone</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Navigation ──────────────────── */}
      <div className="border-b -mx-1">
        <ScrollArea className="w-full">
          <div className="flex gap-0.5 px-1 pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                  activeTab === tab.value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ── DASHBOARD TAB ──────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><Users className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Contacted</p>
                  <p className="text-xl font-bold">842 <span className="text-xs font-normal text-muted-foreground">/ 1,200</span></p>
                </div>
              </div>
              <Progress value={70} className="mt-3 h-1.5" />
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2"><CheckCircle className="h-4 w-4 text-success" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold">68%</p>
                    <span className="text-xs font-medium text-success">↑ 3%</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-destructive/10 p-2"><XCircle className="h-4 w-4 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold">58</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spend</p>
                  <p className="text-xl font-bold font-mono">$127.40</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Outcome Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {outcomes.map((o) => (
                  <div key={o.label} className="flex items-center gap-3 py-1.5">
                    <o.icon className={cn("h-4 w-4 shrink-0", o.color)} />
                    <span className="text-sm flex-1">{o.label}</span>
                    <span className="text-sm font-semibold tabular-nums">{o.count}</span>
                    <div className="w-14"><Progress value={o.pct} className="h-1.5" /></div>
                    <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">{o.pct}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Campaign Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: "Agent", value: campaignAgent.name, click: "agents" },
                  { label: "Phone Number", value: assignedPhone.number, click: "phones" },
                  { label: "Knowledge Docs", value: `${knowledgeDocs.length}`, click: "knowledge" },
                  { label: "Integrations", value: `${Object.values(integrationToggles).filter(Boolean).length} active`, click: "integrations" },
                  { label: "Contacts", value: `${contacts.length} / ${campaignSettings.contactListSize}`, click: "contacts" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.click)}
                    className="flex items-center justify-between py-2 w-full text-left hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      {item.value} <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow label="Total Spend" value="$127.40" mono />
                <InfoRow label="Avg Cost/Call" value="$0.15" mono />
                <InfoRow label="Telephony" value="$42.80" mono />
                <InfoRow label="AI / LLM" value="$68.20" mono />
                <InfoRow label="TTS / STT" value="$16.40" mono />
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm font-semibold">Projected Total</span>
                  <span className="text-sm font-mono font-bold text-primary">$181.70</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Recent Calls</h2>
              <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setActiveTab("calls")}>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
            <DataTable columns={callColumns} data={campaignCalls.slice(0, 5)} onRowClick={(r) => navigate(`/calls/${r.id}`)} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── AGENTS TAB ─────────────────────── */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Assigned Agent</h2>
            <p className="text-sm text-muted-foreground">This campaign uses a single agent. Manage agents on the Agents page.</p>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Bot className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-semibold">{campaignAgent.name}</p>
                    <p className="text-xs text-muted-foreground">{campaignAgent.model} · {campaignAgent.voice}</p>
                  </div>
                </div>
                <StatusBadge status={campaignAgent.status} />
              </div>
              <Separator className="mb-3" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">{campaignAgent.calls}</p>
                  <p className="text-xs text-muted-foreground">Calls</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{campaignAgent.successRate}</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{campaignAgent.model}</p>
                  <p className="text-xs text-muted-foreground">Model</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/agents/${campaignAgent.id}`)}>
                  View Agent <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={campaignStatus === "live"}
                  onClick={() => setChangeAgentOpen(true)}
                >
                  Change Agent
                </Button>
              </div>
              {campaignStatus === "live" && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  Pause the campaign to change the agent.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── CONTACTS TAB ───────────────────── */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Contact List</h2>
              <p className="text-sm text-muted-foreground">{contacts.length} of {campaignSettings.contactListSize} contacts loaded · {campaignSettings.contactsRemaining} remaining</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV</Button>
              <Button variant="outline" size="sm" onClick={() => setImportContactsOpen(true)}><Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV</Button>
              <Button size="sm" onClick={() => setAddContactOpen(true)}><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Contact</Button>
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
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider">Outcome</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider">Retries</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider">Last Call</TableHead>
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
                        <TableCell><Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[contact.status])}>{contact.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{contact.outcome}</TableCell>
                        <TableCell className="hidden md:table-cell">{contact.retryCount}</TableCell>
                        <TableCell className="hidden lg:table-cell">{contact.lastCall}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              if (!editForm.name.trim() || !editForm.phone.trim()) { toast({ title: "Missing fields", description: "Name and phone are required.", variant: "destructive" }); return; }
                              setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, name: editForm.name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim() || "—", company: editForm.company.trim() } : c));
                              setEditingContactId(null);
                              toast({ title: "Contact updated" });
                            }}>
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
                        <TableCell><Badge variant="secondary" className={cn("text-xs capitalize", contactStatusColors[contact.status])}>{contact.status === "do_not_call" ? "DNC" : contact.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell"><span className="text-xs">{contact.outcome}</span></TableCell>
                        <TableCell className="hidden md:table-cell"><span className="text-xs font-mono">{contact.retryCount}</span></TableCell>
                        <TableCell className="hidden lg:table-cell"><span className="text-xs text-muted-foreground">{contact.lastCall}</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditingContactId(contact.id);
                              setEditForm({ name: contact.name, phone: contact.phone, email: contact.email, company: contact.company });
                            }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            {contact.status !== "do_not_call" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark as DNC" onClick={() => {
                                setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: "do_not_call" as ContactStatus } : c));
                                toast({ title: "Marked as DNC", description: `${contact.name} will not be called.` });
                              }}>
                                <Ban className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(`contact-${contact.id}`)}>
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

          {/* Pagination placeholder */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredContacts.length} of {contacts.length} contacts</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── CALL LOGS TAB ──────────────────── */}
      {activeTab === "calls" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Call Logs</h2>
              <p className="text-sm text-muted-foreground">{campaignCalls.length} calls in this campaign</p>
            </div>
          </div>
          <DataTable columns={callColumns} data={campaignCalls} searchKey="contactName" searchPlaceholder="Search calls..." onRowClick={(r) => navigate(`/calls/${r.id}`)} />
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── PHONE NUMBERS TAB ──────────────── */}
      {activeTab === "phones" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Calling Number</h2>
            <p className="text-sm text-muted-foreground">The number your contacts will see</p>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Phone className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-mono font-semibold">{assignedPhone.number}</p>
                    <p className="text-xs text-muted-foreground">{assignedPhone.label} · {assignedPhone.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={assignedPhone.status} />
                  <Button variant="outline" size="sm" disabled={campaignStatus === "live"}>Change Number</Button>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">{assignedPhone.callsMade}</p>
                  <p className="text-xs text-muted-foreground">Calls Made</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{assignedPhone.type}</p>
                  <p className="text-xs text-muted-foreground">Number Type</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-semibold mb-3">Other Workspace Numbers</h3>
            <div className="space-y-2">
              {workspacePhones.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium">{p.number}</p>
                    <p className="text-xs text-muted-foreground">{p.label} · {p.type}</p>
                  </div>
                  <div>
                    {p.campaign !== "—" ? (
                      <Badge variant="secondary" className="text-xs">In use: {p.campaign}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Caller ID Settings</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow label="Display Name" value={campaignSettings.callerIdDisplayName} />
              <InfoRow label="CNAM Registration" value="Active" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── KNOWLEDGE BASE TAB ─────────────── */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Knowledge Base</h2>
              <p className="text-sm text-muted-foreground">{knowledgeDocs.length} documents for agent RAG reference</p>
            </div>
            <Button size="sm" onClick={() => setUploadDocOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Knowledge</Button>
          </div>

          {/* Sync Status Indicator */}
          <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", "border-success/40 bg-success/5")}>
            <div className="h-2.5 w-2.5 rounded-full bg-success shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Knowledge base is synced to ElevenLabs</p>
              <p className="text-xs text-muted-foreground">Last synced 2 hours ago</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <RefreshCw className="h-3 w-3" /> Sync Now
            </Button>
          </div>

          {campaignStatus === "live" && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">Knowledge base is out of sync. New calls will use the updated knowledge base once synced. Calls already in progress are unaffected.</p>
            </div>
          )}

          <div className="space-y-2">
            {knowledgeDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.size} · {doc.pages} chunks</p>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">{doc.type}</Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{doc.lastUpdated}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setDeleteTarget(doc.name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">RAG Configuration</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow label="Chunk Size" value="512 tokens" mono />
              <InfoRow label="Overlap" value="50 tokens" mono />
              <InfoRow label="Top-K Results" value="5" mono />
              <InfoRow label="Similarity Threshold" value="0.78" mono />
              <InfoRow label="Embedding Model" value="text-embedding-3-small" mono />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── INTEGRATIONS TAB ───────────────── */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Campaign Integrations</h2>
              <p className="text-sm text-muted-foreground">Toggle integrations on/off for this campaign. Manage workspace integrations on the Integrations page.</p>
            </div>
          </div>

          <div className="space-y-3">
            {campaignIntegrations.map((int) => (
              <Card key={int.id}>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{int.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-xs text-muted-foreground">{int.description}</p>
                    </div>
                    <Switch
                      checked={integrationToggles[int.id]}
                      onCheckedChange={(checked) => {
                        setIntegrationToggles(prev => ({ ...prev, [int.id]: checked }));
                        toast({ title: `${int.name} ${checked ? "enabled" : "disabled"}`, description: `Integration has been ${checked ? "enabled" : "disabled"} for this campaign.` });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Endpoint</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">https://api.acme.com/webhooks/calls</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
              <InfoRow label="Events" value="call.completed, call.failed, demo.booked" mono />
              <InfoRow label="Retries" value="3 attempts" />
              <InfoRow label="Signing Secret" value="••••••••••••" mono />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── ANALYTICS TAB ──────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Campaign Analytics</h2>
            <p className="text-sm text-muted-foreground">Performance metrics specific to this campaign</p>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Calls" value="842" trend={{ value: "18%", positive: true }} icon={<PhoneCall className="h-4 w-4" />} />
            <StatCard label="Conversion Rate" value="33.8%" trend={{ value: "4.2%", positive: true }} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard label="Avg Duration" value="2:34" icon={<Clock className="h-4 w-4" />} />
            <StatCard label="Cost / Conversion" value="$0.45" trend={{ value: "12%", positive: true }} icon={<DollarSign className="h-4 w-4" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Call Volume (This Week)</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(220 10% 46%)' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(220 10% 46%)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="success" stackId="1" stroke="hsl(152 69% 40%)" fill="hsl(152 69% 40% / 0.2)" />
                    <Area type="monotone" dataKey="failed" stackId="1" stroke="hsl(0 72% 51%)" fill="hsl(0 72% 51% / 0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Outcome Distribution</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Sentiment Distribution</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                      {sentimentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {sentimentData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Response Latency</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(220 10% 46%)' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(220 10% 46%)' }} tickFormatter={(v) => `${v}ms`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="p50" stroke="hsl(152 69% 40%)" strokeWidth={2} name="p50" dot={false} />
                    <Line type="monotone" dataKey="p95" stroke="hsl(38 92% 50%)" strokeWidth={2} name="p95" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ── SETTINGS TAB ───────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Campaign Settings</h2>
            <p className="text-sm text-muted-foreground">Configure scheduling, retry policies, and compliance rules</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Schedule</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <Badge key={day} variant={campaignSettings.schedule.days.includes(day) ? "default" : "secondary"} className="text-xs px-2 py-1">{day}</Badge>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  <InfoRow label="Calling Window" value={`${campaignSettings.schedule.startTime} – ${campaignSettings.schedule.endTime}`} />
                  <InfoRow label="Timezone" value={campaignSettings.schedule.timezone} />
                  <InfoRow label="Start Date" value={campaignSettings.startDate} />
                  <InfoRow label="End Date" value={campaignSettings.endDate} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Retry Policy</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="divide-y divide-border">
                  <InfoRow label="Max Retries" value={String(campaignSettings.retryPolicy.maxRetries)} />
                  <InfoRow label="Retry Delay" value={campaignSettings.retryPolicy.retryDelay} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Retry on outcomes:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {campaignSettings.retryPolicy.retryOn.map((o) => (
                      <Badge key={o} variant="secondary" className="text-xs capitalize">{o.replace("_", " ")}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">General</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow label="Max Concurrency" value={`${campaignSettings.concurrency} calls`} />
                <InfoRow label="Contact List" value={`${campaignSettings.contactListSize} total`} />
                <InfoRow label="Remaining" value={String(campaignSettings.contactsRemaining)} />
                <InfoRow label="Caller ID Name" value={campaignSettings.callerIdDisplayName} />
                <InfoRow label="Created" value={campaignSettings.createdAt} />
                <InfoRow label="Owner" value={campaignSettings.owner} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Compliance & Call Handling</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {([
                  { key: "dnc" as const, label: "Do Not Call (DNC) check" },
                  { key: "record" as const, label: "Record all calls" },
                  { key: "tcpa" as const, label: "TCPA compliance mode" },
                  { key: "voicemailDetect" as const, label: "Voicemail detection" },
                  { key: "leaveVoicemail" as const, label: "Leave voicemail message" },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm">{item.label}</span>
                    <Switch
                      checked={compliance[item.key]}
                      onCheckedChange={(checked) => setCompliance(prev => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-3">Deleting this campaign will free the assigned agent for use in other campaigns.</p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-destructive">Danger Zone</p>
                  <p className="text-sm text-muted-foreground">Permanently delete this campaign and all associated data.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget("campaign")}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────── */}
      <BuyPhoneNumberDialog open={buyNumberOpen} onOpenChange={(open) => { setBuyNumberOpen(open); if (!open && buyNumberOpen) toast({ title: "Phone number purchased" }); }} />
      <UploadDocumentDialog open={uploadDocOpen} onOpenChange={(open) => { setUploadDocOpen(open); if (!open && uploadDocOpen) toast({ title: "Document uploaded", description: "Knowledge base has been updated." }); }} />
      <DeleteConfirmDialog
        open={changeAgentOpen}
        onOpenChange={setChangeAgentOpen}
        title="Change Agent"
        description="Changing the agent will require re-syncing the knowledge base. The campaign will be briefly paused."
        onConfirm={() => { setChangeAgentOpen(false); toast({ title: "Agent changed" }); }}
      />
      <AddContactDialog open={addContactOpen} onOpenChange={setAddContactOpen} onAdd={(c) => {
        setContacts(prev => [{ id: String(Date.now()), name: c.full_name, phone: c.phone, email: c.email || "—", company: c.company || "—", status: "pending", outcome: "—", lastCall: "—", retryCount: 0 }, ...prev]);
        toast({ title: "Contact added", description: `${c.full_name} has been added.` });
      }} />
      <ImportContactsDialog open={importContactsOpen} onOpenChange={setImportContactsOpen} onImported={(count) => toast({ title: "Contacts imported", description: `${count} contacts added.` })} />
      <UploadContactsDialog open={uploadContactsOpen} onOpenChange={setUploadContactsOpen} onImported={(count) => toast({ title: "Contacts imported", description: `${count} contacts have been added.` })} />
      <ConnectIntegrationDialog open={connectIntOpen} onOpenChange={(open) => { setConnectIntOpen(open); }} integration={connectTarget} />
      <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} title="Export Campaign Data" description="Download campaign data in your preferred format." />
      <DeleteConfirmDialog
        open={deleteTarget === "campaign"}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This will remove all contacts, call logs, and integrations associated with it. This action cannot be undone."
        onConfirm={() => { setDeleteTarget(null); toast({ title: "Campaign deleted" }); navigate("/campaigns"); }}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget && deleteTarget.startsWith("contact-")}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Contact"
        description="Are you sure you want to remove this contact from the campaign?"
        onConfirm={() => {
          const contactId = deleteTarget?.replace("contact-", "");
          setContacts(prev => prev.filter(c => c.id !== contactId));
          setDeleteTarget(null);
          toast({ title: "Contact removed" });
        }}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget && deleteTarget !== "campaign" && !deleteTarget.startsWith("contact-")}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Document"
        description={`Are you sure you want to remove "${deleteTarget}" from this campaign's knowledge base?`}
        onConfirm={() => { toast({ title: "Document removed" }); setDeleteTarget(null); }}
      />
      {/* Status transition confirmation */}
      <DeleteConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        title={`${statusConfirm === "completed" ? "Complete" : "Archive"} Campaign`}
        description={statusConfirm === "completed"
          ? "This will stop all calling activity. Contacts not yet reached will remain pending. Are you sure?"
          : "Archiving removes this campaign from the active list. You can still view its data. Continue?"}
        onConfirm={() => statusConfirm && handleStatusTransition(statusConfirm)}
      />
    </div>
  );
}
