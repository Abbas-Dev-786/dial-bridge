import { BarChart3, Bot, Users, PhoneCall, Phone, BookOpen, Link2, TrendingUp, Settings, CalendarCheck, PlayCircle, Edit, Pause, StopCircle, Archive, Play } from "lucide-react";
import { CampaignStatus } from "@/store/useCampaignStore";

export const CAMPAIGN_TABS = [
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

export const STATUS_TRANSITIONS: Record<CampaignStatus, { label: string; icon: any; target: CampaignStatus; variant?: string }[]> = {
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

