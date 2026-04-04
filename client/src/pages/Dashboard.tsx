import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, Column } from "@/components/DataTable";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  TrendingUp,
  Clock,
  DollarSign,
  Bot,
  Megaphone,
  Rocket,
  Check,
  ChevronRight,
  Plus,
  Phone,
  ArrowRight,
  Zap,
  Trophy,
  BarChart3,
} from "lucide-react";

/* ─── Mock data ─── */

const activeCampaigns = [
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

const recentConversations = [
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

const conversationColumns: Column<(typeof recentConversations)[0]>[] = [
  {
    key: "contact",
    label: "Contact",
    sortable: true,
    render: (r) => <span className="font-mono text-sm">{r.contact}</span>,
  },
  { key: "agent", label: "Agent", sortable: true, hideOnMobile: true },
  {
    key: "campaign",
    label: "Campaign",
    sortable: true,
    hideOnMobile: true,
    render: (r) => (
      <Badge variant="secondary" className="text-xs font-normal">
        {r.campaign}
      </Badge>
    ),
  },
  {
    key: "duration",
    label: "Duration",
    sortable: true,
    hideOnMobile: true,
    render: (r) => <span className="font-mono text-sm">{r.duration}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (r) => <StatusBadge status={r.status} />,
  },
  { key: "time", label: "Time", sortable: true, hideOnMobile: true },
];

/* ─── Onboarding step config ─── */

const onboardingSteps = [
  { key: "agent", label: "Create Agent", icon: Bot, href: "/campaigns" },
  {
    key: "campaign",
    label: "Create Campaign",
    icon: Megaphone,
    href: "/campaigns/create",
  },
  { key: "launch", label: "Go Live", icon: Rocket, href: "/campaigns" },
];

/* ─── Component ─── */

export default function Dashboard() {
  const navigate = useNavigate();

  // Toggle these to test empty state
  const hasAgents = true;
  const hasCampaigns = activeCampaigns.length > 0;
  const completedSteps = hasAgents && hasCampaigns ? 3 : hasAgents ? 1 : 0;
  const showOnboarding = completedSteps < 3;
  const isEmpty = !hasAgents && !hasCampaigns;

  if (isEmpty) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="mx-auto max-w-lg text-center px-4">
          {/* Illustration */}
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
            <div className="relative">
              <Rocket className="h-16 w-16 text-primary" />
              <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Zap className="h-4 w-4" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Launch your first voice campaign
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Build an AI voice agent, add it to a campaign, and start making
            calls — all in under 5 minutes.
          </p>

          {/* Steps preview */}
          <div className="mt-8 flex flex-col gap-3 text-left">
            {[
              {
                step: 1,
                icon: Bot,
                label: "Create an Agent",
                desc: "Configure voice, personality & knowledge base",
              },
              {
                step: 2,
                icon: Megaphone,
                label: "Set up a Campaign",
                desc: "Add contacts, assign agents & phone numbers",
              },
              {
                step: 3,
                icon: Rocket,
                label: "Go Live",
                desc: "Launch and monitor calls in real time",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {s.step}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="mt-8 px-8"
            onClick={() => navigate("/campaigns")}
          >
            <Bot className="mr-2 h-5 w-5" /> Create Your First Agent
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            No credit card required to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, Alex
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasCampaigns
                ? `You have ${activeCampaigns.length} active campaign${activeCampaigns.length > 1 ? "s" : ""} running`
                : "Let's get your first campaign up and running"}
            </p>
          </div>
          <div className="flex gap-2">
            {/* <Button variant="outline" onClick={() => navigate("/campaigns")}>
              View Campaigns
            </Button> */}
            <Button onClick={() => navigate("/campaigns")}>
              <Plus className="mr-2 h-4 w-4" /> Create Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* ── Quick Actions Grid ── */}
      {/* <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Megaphone, label: "New Campaign", desc: "Launch outbound calls", href: "/campaigns" },
          { icon: Bot, label: "New Agent", desc: "Build a voice agent", href: "/agents/new" },
          { icon: BarChart3, label: "View Analytics", desc: "See performance data", href: "/analytics" },
          { icon: Phone, label: "Add Phone Number", desc: "Get a new number", href: "/phone-numbers" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.href)}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 text-left"
          >
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <action.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{action.label}</p>
              <p className="text-xs text-muted-foreground truncate">{action.desc}</p>
            </div>
          </button>
        ))}
      </div> */}

      {/* ── Onboarding Stepper ── */}
      {showOnboarding && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Getting Started</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {onboardingSteps.map((step, i) => {
              const done = i < completedSteps;
              const active = i === completedSteps;
              return (
                <button
                  key={step.key}
                  onClick={() => navigate(step.href)}
                  className={`flex-1 flex items-center gap-3 rounded-lg border p-4 transition-all text-left ${
                    done
                      ? "border-primary/30 bg-primary/5"
                      : active
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border bg-muted/30 opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {done ? "Completed" : active ? "Next step" : "Upcoming"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Campaigns (Hero Section) ── */}
      {hasCampaigns && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Campaigns</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/campaigns")}
              className="text-muted-foreground"
            >
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeCampaigns.map((c) => {
              const progress = Math.round((c.called / c.total) * 100);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Megaphone className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold truncate">{c.name}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <Progress value={progress} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    {c.called.toLocaleString()} / {c.total.toLocaleString()}{" "}
                    called · {progress}%
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Success</p>
                      <p className="text-sm font-semibold">{c.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Spent</p>
                      <p className="text-sm font-semibold">
                        ${c.spent.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Agents</p>
                      <p className="text-sm font-semibold">{c.agents}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Last activity: {c.lastActivity}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Aggregated KPIs ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Calls"
          value="1,284"
          trend={{ value: "12%", positive: true }}
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <StatCard
          label="Top Agent Success"
          value="94.2%"
          trend={{ value: "2.1%", positive: true }}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Minutes Used"
          value="4,320"
          icon={<Clock className="h-4 w-4" />}
        >
          <Progress value={43} className="mt-3 h-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">
            4,320 / 10,000 min
          </p>
        </StatCard>
        <StatCard
          label="Total Cost"
          value="$180.70"
          trend={{ value: "8%", positive: false }}
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* ── Recent Conversations + Quick Stats ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/call-logs")}
              className="text-muted-foreground"
            >
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <DataTable
            columns={conversationColumns}
            data={recentConversations}
            searchKey="contact"
            searchPlaceholder="Search conversations..."
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Quick Stats</h2>
          {[
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
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`rounded-lg bg-primary/10 p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold truncate">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            </div>
          ))}

          {/* Usage CTA */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Monthly plan usage</p>
              <Badge variant="secondary" className="text-xs">
                25%
              </Badge>
            </div>
            <Progress value={25} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              1,250 of 5,000 calls used
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/settings/billing")}
            >
              Upgrade Plan <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
