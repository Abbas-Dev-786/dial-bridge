import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { PhoneCall, TrendingUp, Clock, DollarSign, Zap, Timer, SmilePlus } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { date: "Week 1", telephony: 42, ai: 85, tts: 28 },
  { date: "Week 2", telephony: 55, ai: 110, tts: 35 },
  { date: "Week 3", telephony: 48, ai: 95, tts: 30 },
  { date: "Week 4", telephony: 60, ai: 120, tts: 38 },
];

const latencyData = [
  { date: "Mon", p50: 180, p95: 420, p99: 680 },
  { date: "Tue", p50: 165, p95: 390, p99: 650 },
  { date: "Wed", p50: 190, p95: 450, p99: 720 },
  { date: "Thu", p50: 170, p95: 400, p99: 660 },
  { date: "Fri", p50: 155, p95: 370, p99: 610 },
  { date: "Sat", p50: 140, p95: 340, p99: 580 },
  { date: "Sun", p50: 135, p95: 330, p99: 560 },
];

const outcomeData = [
  { name: "Booked Demo", value: 34, color: "hsl(152 69% 40%)" },
  { name: "Interested", value: 22, color: "hsl(210 80% 55%)" },
  { name: "Not Interested", value: 20, color: "hsl(38 92% 50%)" },
  { name: "No Answer", value: 12, color: "hsl(220 10% 46%)" },
  { name: "Voicemail", value: 7, color: "hsl(220 10% 70%)" },
  { name: "Failed", value: 5, color: "hsl(0 72% 51%)" },
];

const sentimentData = [
  { name: "Positive", value: 45, color: "hsl(152 69% 40%)" },
  { name: "Neutral", value: 32, color: "hsl(38 92% 50%)" },
  { name: "Negative", value: 15, color: "hsl(0 72% 51%)" },
  { name: "Unknown", value: 8, color: "hsl(220 10% 70%)" },
];

const campaigns = [
  { id: "all", name: "All Campaigns" },
  { id: "1", name: "Q1 Outreach" },
  { id: "2", name: "Product Launch" },
  { id: "3", name: "Survey Q1" },
  { id: "4", name: "Re-engagement" },
];

const tooltipStyle = { backgroundColor: 'hsl(0 0% 100%)', border: '1px solid hsl(30 15% 90%)', borderRadius: '8px' };
const axisTick = { fill: 'hsl(220 10% 46%)' };

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7d");
  const [campaignFilter, setCampaignFilter] = useState("all");

  const selectedCampaignName = campaigns.find(c => c.id === campaignFilter)?.name || "All Campaigns";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {campaignFilter === "all"
              ? "Showing metrics across all campaigns"
              : `Showing metrics for ${selectedCampaignName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total Conversations" value="1,250" trend={{ value: "18%", positive: true }} icon={<PhoneCall className="h-4 w-4" />} />
        <StatCard label="Success Rate" value="92.4%" trend={{ value: "1.2%", positive: true }} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg Duration" value="2:48" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Avg Latency (p50)" value="168ms" trend={{ value: "12ms", positive: true }} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Total Cost" value="$415" trend={{ value: "8%", positive: false }} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Avg Turn Time" value="1.2s" icon={<Timer className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversation Volume */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Conversation Volume</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis className="text-xs" tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="success" stackId="1" stroke="hsl(152 69% 40%)" fill="hsl(152 69% 40% / 0.2)" name="Successful" />
                <Area type="monotone" dataKey="failed" stackId="1" stroke="hsl(0 72% 51%)" fill="hsl(0 72% 51% / 0.2)" name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Cost Breakdown (ElevenLabs Credits)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis className="text-xs" tick={axisTick} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="telephony" fill="hsl(220 10% 46% / 0.5)" radius={[4, 4, 0, 0]} name="Telephony" />
                <Bar dataKey="ai" fill="hsl(15 90% 55%)" radius={[4, 4, 0, 0]} name="LLM" />
                <Bar dataKey="tts" fill="hsl(15 90% 55% / 0.5)" radius={[4, 4, 0, 0]} name="TTS (Voice)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Latency */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Response Latency</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis className="text-xs" tick={axisTick} tickFormatter={(v) => `${v}ms`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="p50" stroke="hsl(152 69% 40%)" strokeWidth={2} name="p50" dot={false} />
                <Line type="monotone" dataKey="p95" stroke="hsl(38 92% 50%)" strokeWidth={2} name="p95" dot={false} />
                <Line type="monotone" dataKey="p99" stroke="hsl(0 72% 51%)" strokeWidth={2} name="p99" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome Distribution */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Outcome Distribution</h3>
          <div className="h-[260px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {outcomeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {outcomeData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Sentiment Distribution</h3>
          <div className="h-[260px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {sentimentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
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
        </div>
      </div>
    </div>
  );
}
