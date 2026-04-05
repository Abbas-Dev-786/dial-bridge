import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const tooltipStyle = { backgroundColor: 'hsl(0 0% 100%)', border: '1px solid hsl(30 15% 90%)', borderRadius: '8px' };
const axisTick = { fill: 'hsl(220 10% 46%)' };

interface VolumeData {
  date: string;
  calls_total: number;
  calls_completed: number;
  calls_failed: number;
  calls_voicemail: number;
}

export function ConversationVolumeChart({ data }: { data: VolumeData[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Conversation Volume</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" tick={axisTick} />
            <YAxis className="text-xs" tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="calls_completed" stackId="1" stroke="hsl(152 69% 40%)" fill="hsl(152 69% 40% / 0.2)" name="Successful" />
            <Area type="monotone" dataKey="calls_failed" stackId="1" stroke="hsl(0 72% 51%)" fill="hsl(0 72% 51% / 0.2)" name="Failed" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface CostData {
  date: string;
  cost_telephony_cents: number;
  cost_llm_cents: number;
  cost_tts_cents: number;
  total_cost_cents: number;
}

export function CostBreakdownChart({ data }: { data: CostData[] }) {
  // Convert cents to dollars for the chart display
  const chartData = data.map(d => ({
    ...d,
    telephony: d.cost_telephony_cents / 100,
    ai: d.cost_llm_cents / 100,
    tts: d.cost_tts_cents / 100,
  }));

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Cost Breakdown ($)</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
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
  );
}

interface LatencyData {
  date: string;
  avg_latency_p50_ms: number | null;
  avg_latency_p95_ms: number | null;
}

export function ResponseLatencyChart({ data }: { data: LatencyData[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Response Latency (ms)</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" tick={axisTick} />
            <YAxis className="text-xs" tick={axisTick} tickFormatter={(v) => `${v}ms`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="avg_latency_p50_ms" stroke="hsl(152 69% 40%)" strokeWidth={2} name="p50" dot={false} />
            <Line type="monotone" dataKey="avg_latency_p95_ms" stroke="hsl(38 92% 50%)" strokeWidth={2} name="p95" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface OutcomeDistribution {
  booked_demo: number;
  interested: number;
  not_interested: number;
  callback_requested: number;
  voicemail: number;
  no_answer: number;
  failed: number;
}

export function OutcomeDistributionChart({ data }: { data: OutcomeDistribution }) {
  const chartData = [
    { name: "Booked Demo", value: data.booked_demo, color: "hsl(152 69% 40%)" },
    { name: "Interested", value: data.interested, color: "hsl(152 69% 50%)" },
    { name: "Not Interested", value: data.not_interested, color: "hsl(0 72% 51% / 0.5)" },
    { name: "Callback", value: data.callback_requested, color: "hsl(38 92% 50%)" },
    { name: "Voicemail", value: data.voicemail, color: "hsl(220 10% 46% / 0.5)" },
    { name: "Failed/No Answer", value: data.failed + data.no_answer, color: "hsl(0 72% 51%)" },
  ].filter(d => d.value > 0);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Outcome Distribution</h3>
      <div className="h-[260px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name} ({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
}

export function SentimentDistributionChart({ data }: { data: SentimentDistribution }) {
  const chartData = [
    { name: "Positive", value: data.positive, color: "hsl(152 69% 40%)" },
    { name: "Neutral", value: data.neutral, color: "hsl(38 92% 50%)" },
    { name: "Negative", value: data.negative, color: "hsl(0 72% 51%)" },
    { name: "Unknown", value: data.unknown, color: "hsl(220 10% 46% / 0.5)" },
  ].filter(d => d.value > 0);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Sentiment Distribution</h3>
      <div className="h-[260px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name} ({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
