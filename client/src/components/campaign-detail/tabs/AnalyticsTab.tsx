import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  VOLUME_DATA,
  COST_DATA,
  LATENCY_DATA,
  OUTCOME_DATA,
  SENTIMENT_DATA,
} from "@/lib/mockData";
import { Button } from "@/components/ui/button";

const tooltipStyle = {
  backgroundColor: "hsl(0 0% 100%)",
  border: "1px solid hsl(30 15% 90%)",
  borderRadius: "8px",
};
const axisTick = { fill: "hsl(220 10% 46%)" };

export function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Conversation Volume
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VOLUME_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis className="text-xs" tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="success"
                  stackId="1"
                  stroke="hsl(152 69% 40%)"
                  fill="hsl(152 69% 40% / 0.2)"
                  name="Successful"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="1"
                  stroke="hsl(0 72% 51%)"
                  fill="hsl(0 72% 51% / 0.2)"
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Telephony Latency
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LATENCY_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis
                  className="text-xs"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke="hsl(152 69% 40%)"
                  strokeWidth={2}
                  name="p50"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  name="p95"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Cost Distribution
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COST_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" className="text-xs" tick={axisTick} />
                <YAxis
                  className="text-xs"
                  tick={axisTick}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="telephony"
                  fill="hsl(220 10% 46% / 0.5)"
                  radius={[4, 4, 0, 0]}
                  name="Telephony"
                />
                <Bar
                  dataKey="ai"
                  fill="hsl(15 90% 55%)"
                  radius={[4, 4, 0, 0]}
                  name="LLM"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
            Sentiment Breakdown
          </h3>
          <div className="h-[260px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SENTIMENT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {SENTIMENT_DATA.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SettingsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">General Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure global behavior and scheduling for this campaign.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Campaign Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold mb-1">Timezone</p>
              <p className="text-sm">US/Eastern (UTC-5)</p>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Daily Limit</p>
              <p className="text-sm">500 total calls</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Deleting this campaign will stop all active calls and remove its
            configuration. This action cannot be undone.
          </p>
          <Button variant="destructive" size="sm">
            Archive Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
