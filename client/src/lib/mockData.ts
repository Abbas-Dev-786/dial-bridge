import { Bot, Megaphone, Rocket, PhoneCall, TrendingUp, Clock, DollarSign, Zap, Trophy, BarChart3 } from "lucide-react";

/* ── Dashboard Mock Data ── */

export const ACTIVE_CAMPAIGNS = [
  {
    id: "1",
    name: "Q1 Outreach",
    status: "live" as const,
    called: 842,
    total: 1200,
    successRate: 68,
    spent: 142.5,
    agents: 3,
    lastActivity: "2 min ago",
  },
  {
    id: "2",
    name: "Product Launch",
    status: "live" as const,
    called: 156,
    total: 500,
    successRate: 72,
    spent: 38.2,
    agents: 2,
    lastActivity: "8 min ago",
  },
];

export const RECENT_CONVERSATIONS = [
  {
    contact: "+1 (555) 123-4567",
    agent: "Sales Bot",
    campaign: "Q1 Outreach",
    duration: "3:42",
    status: "live" as const,
    time: "2 min ago",
  },
  {
    contact: "+1 (555) 987-6543",
    agent: "Support AI",
    campaign: "Product Launch",
    duration: "1:15",
    status: "live" as const,
    time: "5 min ago",
  },
  {
    contact: "+1 (555) 456-7890",
    agent: "Outreach Pro",
    campaign: "Q1 Outreach",
    duration: "5:08",
    status: "paused" as const,
    time: "12 min ago",
  },
  {
    contact: "+1 (555) 321-0987",
    agent: "Sales Bot",
    campaign: "Q1 Outreach",
    duration: "0:45",
    status: "error" as const,
    time: "18 min ago",
  },
  {
    contact: "+1 (555) 654-3210",
    agent: "Survey Agent",
    campaign: "Product Launch",
    duration: "2:33",
    status: "live" as const,
    time: "25 min ago",
  },
  {
    contact: "+1 (555) 789-0123",
    agent: "Support AI",
    campaign: "Q1 Outreach",
    duration: "4:12",
    status: "live" as const,
    time: "30 min ago",
  },
];

export const ONBOARDING_STEPS = [
  { key: "agent", label: "Create Agent", icon: Bot, href: "/campaigns" },
  {
    key: "campaign",
    label: "Create Campaign",
    icon: Megaphone,
    href: "/campaigns/create",
  },
  { key: "launch", label: "Go Live", icon: Rocket, href: "/campaigns" },
];

export const QUICK_STATS = [
  {
    icon: Trophy,
    label: "Top Agent",
    value: "Sales Bot",
    sub: "94.2% success rate",
    color: "text-amber-500",
  },
  {
    icon: Megaphone,
    label: "Busiest Campaign",
    value: "Q1 Outreach",
    sub: "842 calls today",
    color: "text-primary",
  },
  {
    icon: BarChart3,
    label: "Monthly Usage",
    value: "1,250 / 5,000",
    sub: "calls this month",
    color: "text-emerald-500",
  },
];

/* ── Campaign Detail Mock Data ── */

export const CAMPAIGN_CALLS = [
  { id: "c1", contact: "+1 (555) 101-0101", contactName: "Sarah Johnson", status: "live" as const, duration: "2:15", outcome: "Booked demo", sentiment: "Positive", time: "5 min ago", cost: "$0.12", agent: "Sales Bot Pro" },
  { id: "c2", contact: "+1 (555) 202-0202", contactName: "Mike Chen", status: "live" as const, duration: "3:42", outcome: "Interested", sentiment: "Positive", time: "12 min ago", cost: "$0.18", agent: "Sales Bot Pro" },
  { id: "c3", contact: "+1 (555) 303-0303", contactName: "Lisa Park", status: "error" as const, duration: "0:08", outcome: "No answer", sentiment: "—", time: "15 min ago", cost: "$0.02", agent: "Sales Bot Pro" },
  { id: "c4", contact: "+1 (555) 404-0404", contactName: "David Kim", status: "live" as const, duration: "1:55", outcome: "Not interested", sentiment: "Negative", time: "22 min ago", cost: "$0.09", agent: "Sales Bot Pro" },
  { id: "c5", contact: "+1 (555) 505-0505", contactName: "Emma Wilson", status: "paused" as const, duration: "—", outcome: "Pending", sentiment: "—", time: "Scheduled", cost: "—", agent: "Sales Bot Pro" },
  { id: "c6", contact: "+1 (555) 606-0606", contactName: "Tom Brown", status: "live" as const, duration: "4:12", outcome: "Booked demo", sentiment: "Positive", time: "30 min ago", cost: "$0.21", agent: "Sales Bot Pro" },
  { id: "c7", contact: "+1 (555) 707-0707", contactName: "Ana Garcia", status: "error" as const, duration: "0:03", outcome: "Busy", sentiment: "—", time: "35 min ago", cost: "$0.01", agent: "Sales Bot Pro" },
  { id: "c8", contact: "+1 (555) 808-0808", contactName: "James Lee", status: "live" as const, duration: "2:48", outcome: "Follow-up", sentiment: "Neutral", time: "42 min ago", cost: "$0.14", agent: "Sales Bot Pro" },
];

export const INITIAL_CONTACTS = [
  { id: "1", name: "Sarah Johnson", phone: "+1 (555) 101-0101", email: "sarah@example.com", company: "Acme Inc", status: "called" as const, outcome: "Booked demo", lastCall: "5 min ago", retryCount: 0 },
  { id: "2", name: "Mike Chen", phone: "+1 (555) 202-0202", email: "mike@example.com", company: "TechCorp", status: "called" as const, outcome: "Interested", lastCall: "12 min ago", retryCount: 0 },
  { id: "3", name: "Lisa Park", phone: "+1 (555) 303-0303", email: "lisa@example.com", company: "StartupCo", status: "failed" as const, outcome: "No answer", lastCall: "15 min ago", retryCount: 2 },
  { id: "4", name: "David Kim", phone: "+1 (555) 404-0404", email: "david@example.com", company: "BigCo", status: "called" as const, outcome: "Not interested", lastCall: "22 min ago", retryCount: 0 },
  { id: "5", name: "Emma Wilson", phone: "+1 (555) 505-0505", email: "emma@example.com", company: "DesignLab", status: "pending" as const, outcome: "—", lastCall: "—", retryCount: 0 },
  { id: "6", name: "Tom Brown", phone: "+1 (555) 606-0606", email: "tom@example.com", company: "MediaGroup", status: "called" as const, outcome: "Booked demo", lastCall: "30 min ago", retryCount: 0 },
  { id: "7", name: "Rachel Green", phone: "+1 (555) 909-0909", email: "rachel@example.com", company: "ConsultCo", status: "do_not_call" as const, outcome: "—", lastCall: "—", retryCount: 0 },
  { id: "8", name: "Carlos Lopez", phone: "+1 (555) 010-1010", email: "carlos@example.com", company: "FinServ", status: "opted_out" as const, outcome: "—", lastCall: "1 hr ago", retryCount: 1 },
];

export const KNOWLEDGE_DOCS = [
  { id: "1", name: "Product Overview 2024.pdf", type: "PDF", size: "2.4 MB", pages: 32, lastUpdated: "2 days ago" },
  { id: "2", name: "Pricing & Plans.pdf", type: "PDF", size: "850 KB", pages: 8, lastUpdated: "1 week ago" },
  { id: "3", name: "FAQ Database", type: "Web Scrape", size: "1.1 MB", pages: 156, lastUpdated: "3 days ago" },
  { id: "4", name: "Case Studies Collection", type: "PDF", size: "4.8 MB", pages: 45, lastUpdated: "5 days ago" },
];

export const CAMPAIGN_INTEGRATIONS = [
  { id: "hubspot", name: "HubSpot", description: "Sync contacts and deals", icon: "🔶", enabled: true },
  { id: "salesforce", name: "Salesforce", description: "Log call outcomes to CRM", icon: "☁️", enabled: true },
  { id: "calendar", name: "Google Calendar", description: "Book demos in available slots", icon: "📅", enabled: true },
  { id: "slack", name: "Slack", description: "Demo booked notifications", icon: "💬", enabled: true },
  { id: "webhooks", name: "Custom Webhooks", description: "POST results to endpoint", icon: "🔗", enabled: true },
  { id: "zapier", name: "Zapier", description: "Automation workflows", icon: "⚡", enabled: false },
];

/* ── Analytics Mock Data ── */

export const VOLUME_DATA = [
  { date: "Mon", calls: 180, success: 165, failed: 15 },
  { date: "Tue", calls: 220, success: 198, failed: 22 },
  { date: "Wed", calls: 195, success: 178, failed: 17 },
  { date: "Thu", calls: 260, success: 240, failed: 20 },
  { date: "Fri", calls: 240, success: 218, failed: 22 },
  { date: "Sat", calls: 90, success: 82, failed: 8 },
  { date: "Sun", calls: 65, success: 60, failed: 5 },
];

export const COST_DATA = [
  { date: "Week 1", telephony: 42, ai: 85, tts: 28 },
  { date: "Week 2", telephony: 55, ai: 110, tts: 35 },
  { date: "Week 3", telephony: 48, ai: 95, tts: 30 },
  { date: "Week 4", telephony: 60, ai: 120, tts: 38 },
];

export const LATENCY_DATA = [
  { date: "Mon", p50: 180, p95: 420, p99: 680 },
  { date: "Tue", p50: 165, p95: 390, p99: 650 },
  { date: "Wed", p50: 190, p95: 450, p99: 720 },
  { date: "Thu", p50: 170, p95: 400, p99: 660 },
  { date: "Fri", p50: 155, p95: 370, p99: 610 },
  { date: "Sat", p50: 140, p95: 340, p99: 580 },
  { date: "Sun", p50: 135, p95: 330, p99: 560 },
];

export const OUTCOME_DATA = [
  { name: "Booked Demo", value: 34, color: "hsl(152 69% 40%)" },
  { name: "Interested", value: 22, color: "hsl(210 80% 55%)" },
  { name: "Not Interested", value: 20, color: "hsl(38 92% 50%)" },
  { name: "No Answer", value: 12, color: "hsl(220 10% 46%)" },
  { name: "Voicemail", value: 7, color: "hsl(220 10% 70%)" },
  { name: "Failed", value: 5, color: "hsl(0 72% 51%)" },
];

export const SENTIMENT_DATA = [
  { name: "Positive", value: 45, color: "hsl(152 69% 40%)" },
  { name: "Neutral", value: 32, color: "hsl(38 92% 50%)" },
  { name: "Negative", value: 15, color: "hsl(0 72% 51%)" },
  { name: "Unknown", value: 8, color: "hsl(220 10% 70%)" },
];
