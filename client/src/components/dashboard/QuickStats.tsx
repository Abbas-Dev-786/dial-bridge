import { User, Megaphone, TrendingUp, Zap } from "lucide-react";
import { useMemo } from "react";

interface Campaign {
  id: string;
  name: string;
  processed_contacts: number;
}

interface CallListItem {
  agent_name: string | null;
}

interface QuickStatsProps {
  recentCalls: CallListItem[];
  campaigns: Campaign[];
}

export function QuickStats({ recentCalls, campaigns }: QuickStatsProps) {
  const stats = useMemo(() => {
    // Top Agent logic: most frequent agent in recent calls
    const agentCounts = recentCalls.reduce((acc, call) => {
      if (call.agent_name) acc[call.agent_name] = (acc[call.agent_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topAgentName = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "No recent activity";

    // Busiest Campaign: most processed contacts
    const busiestCampaign = [...campaigns].sort((a, b) => b.processed_contacts - a.processed_contacts)[0];
    
    const totalOutreach = campaigns.reduce((sum, c) => sum + c.processed_contacts, 0);

    return [
      {
        label: "Top Agent",
        value: topAgentName,
        sub: recentCalls.length > 0 ? "Leading recent activity" : "Awaiting calls",
        icon: User,
        color: "text-blue-500",
      },
      {
        label: "Busiest Campaign",
        value: busiestCampaign?.name || "None active",
        sub: busiestCampaign ? `${busiestCampaign.processed_contacts.toLocaleString()} contacts reached` : "Launch a campaign",
        icon: Megaphone,
        color: "text-purple-500",
      },
      {
        label: "Total Outreach",
        value: totalOutreach.toLocaleString(),
        sub: "Contacts reached so far",
        icon: TrendingUp,
        color: "text-emerald-500",
      },
    ];
  }, [recentCalls, campaigns]);

  return (
    <div className="lg:col-span-2 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Quick Stats</h2>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md group"
        >
          <div className={`rounded-lg bg-primary/10 p-2.5 ${stat.color} transition-transform group-hover:scale-110`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="font-bold truncate text-sm">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
          </div>
          <Zap className="h-3 w-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}
