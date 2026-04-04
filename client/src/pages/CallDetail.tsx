import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { ChevronLeft, Download, Flag, Play, Pause } from "lucide-react";
import { useState } from "react";

const metadata = {
  contact: "+1 (555) 123-4567",
  agent: "Sales Bot",
  agentId: "agent_abc123",
  direction: "Outbound",
  date: "Mar 7, 2026, 2:34 PM",
  duration: "3:42",
  status: "live" as const,
  conversationId: "conv_1a2b3c4d",
  model: "GPT-4o",
  voice: "Sarah",
  language: "English",
};

const costBreakdown = [
  { label: "LLM (GPT-4o)", value: "$0.06" },
  { label: "TTS (Voice)", value: "$0.03" },
  { label: "Telephony", value: "$0.03" },
  { label: "Total", value: "$0.12", bold: true },
];

const evaluations = [
  { criteria: "Qualified the lead", passed: true },
  { criteria: "Booked a demo", passed: true },
  { criteria: "Mentioned pricing", passed: false },
  { criteria: "Stayed on script", passed: true },
  { criteria: "Handled objections", passed: true },
];

const transcript = [
  { speaker: "agent", text: "Hello! This is Alex from Acme Corp. Am I speaking with John?", time: "0:00", latency: "—" },
  { speaker: "user", text: "Yes, this is John. What's this about?", time: "0:04", latency: "—" },
  { speaker: "agent", text: "Great! I'm reaching out because you expressed interest in our enterprise solution. I wanted to see if you had a few minutes to discuss how we can help streamline your operations.", time: "0:07", latency: "180ms" },
  { speaker: "user", text: "Sure, I've got about 5 minutes. What can you tell me?", time: "0:18", latency: "—" },
  { speaker: "agent", text: "Our platform handles automated customer calls, qualification, and scheduling. Most of our clients see a 40% reduction in manual outreach time. Would you like me to schedule a demo with our solutions team?", time: "0:22", latency: "165ms" },
  { speaker: "user", text: "That sounds promising. Can we do Thursday afternoon?", time: "0:35", latency: "—" },
  { speaker: "tool", text: "[calendar.check_availability] → Available: Thursday 2:00 PM ✓", time: "0:36", latency: "320ms" },
  { speaker: "agent", text: "Thursday at 2 PM works perfectly. I've booked that for you. You'll receive a confirmation email shortly. Is there anything else I can help with?", time: "0:38", latency: "155ms" },
  { speaker: "user", text: "No, that's all. Thanks!", time: "0:48", latency: "—" },
  { speaker: "agent", text: "Thank you, John! Have a great day.", time: "0:50", latency: "140ms" },
];

const collectedData = [
  { field: "Name", value: "John" },
  { field: "Interest Level", value: "High" },
  { field: "Meeting Booked", value: "Thursday 2:00 PM" },
  { field: "Objections", value: "None" },
];

export default function CallDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/calls")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversation Detail</h1>
          <p className="text-sm text-muted-foreground font-mono">{metadata.conversationId}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm">Conversation Info</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Contact", value: metadata.contact, mono: true },
                { label: "Agent", value: metadata.agent },
                { label: "Model", value: metadata.model },
                { label: "Voice", value: metadata.voice },
                { label: "Direction", value: metadata.direction },
                { label: "Date", value: metadata.date },
                { label: "Duration", value: metadata.duration, mono: true },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={item.mono ? "font-mono" : ""}>{item.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={metadata.status} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm">Cost Breakdown</h3>
            {costBreakdown.map((item) => (
              <div key={item.label} className={cn("flex justify-between text-sm", item.bold && "font-semibold border-t pt-2")}>
                <span className={item.bold ? "" : "text-muted-foreground"}>{item.label}</span>
                <span className="font-mono">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm">Evaluation Criteria</h3>
            {evaluations.map((e) => (
              <div key={e.criteria} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{e.criteria}</span>
                <Badge variant={e.passed ? "default" : "secondary"} className={cn("text-xs", e.passed ? "bg-success text-success-foreground" : "")}>
                  {e.passed ? "Pass" : "Fail"}
                </Badge>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm">Collected Data</h3>
            {collectedData.map((d) => (
              <div key={d.field} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{d.field}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm"><Download className="mr-2 h-3.5 w-3.5" /> Download Recording</Button>
            <Button variant="outline" size="sm"><Download className="mr-2 h-3.5 w-3.5" /> Export Transcript</Button>
            <Button variant="outline" size="sm"><Flag className="mr-2 h-3.5 w-3.5" /> Flag for Review</Button>
          </div>
        </div>

        {/* Right Column — Transcript */}
        <div className="lg:col-span-3 space-y-4">
          {/* Audio Player */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="h-8 rounded bg-muted flex items-end gap-px px-1">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${Math.random() * 100}%` }} />
                  ))}
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">0:00 / 3:42</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              {[1, 1.5, 2].map((s) => (
                <Button key={s} variant={playbackSpeed === s ? "default" : "ghost"} size="sm" className="h-6 px-2 text-xs" onClick={() => setPlaybackSpeed(s)}>
                  {s}x
                </Button>
              ))}
            </div>
          </div>

          {/* Turn-by-turn Transcript */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-sm">Turn-by-Turn Transcript</h3>
            <div className="space-y-3">
              {transcript.map((line, i) => (
                <div key={i} className={cn(
                  "flex",
                  line.speaker === "agent" ? "justify-start" : line.speaker === "tool" ? "justify-center" : "justify-end"
                )}>
                  {line.speaker === "tool" ? (
                    <div className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {line.text}
                      <span className="ml-2 text-primary">{line.latency}</span>
                    </div>
                  ) : (
                    <div className={cn(
                      "max-w-[85%] rounded-xl px-4 py-2.5",
                      line.speaker === "agent" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                          {line.speaker === "agent" ? "Agent" : "User"}
                        </span>
                        {line.latency !== "—" && (
                          <span className="text-[10px] font-mono text-primary">{line.latency}</span>
                        )}
                      </div>
                      <p className="text-sm">{line.text}</p>
                      <button className="text-[10px] text-primary hover:underline mt-1">{line.time}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
