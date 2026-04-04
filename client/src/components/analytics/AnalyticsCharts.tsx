import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { VOLUME_DATA, COST_DATA, LATENCY_DATA, OUTCOME_DATA, SENTIMENT_DATA } from "@/lib/mockData";

const tooltipStyle = { backgroundColor: 'hsl(0 0% 100%)', border: '1px solid hsl(30 15% 90%)', borderRadius: '8px' };
const axisTick = { fill: 'hsl(220 10% 46%)' };

export function ConversationVolumeChart() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Conversation Volume</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={VOLUME_DATA}>
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
  );
}

export function CostBreakdownChart() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Cost Breakdown (ElevenLabs Credits)</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={COST_DATA}>
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

export function ResponseLatencyChart() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Response Latency</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={LATENCY_DATA}>
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
  );
}

export function OutcomeDistributionChart() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Outcome Distribution</h3>
      <div className="h-[260px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={OUTCOME_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
              {OUTCOME_DATA.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {OUTCOME_DATA.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SentimentDistributionChart() {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Sentiment Distribution</h3>
      <div className="h-[260px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={SENTIMENT_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
              {SENTIMENT_DATA.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {SENTIMENT_DATA.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
