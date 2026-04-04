import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Clock, Zap, DollarSign } from "lucide-react";
import { VoiceConfig, elevenLabsVoices } from "@/components/VoiceSettings";
import { cn } from "@/lib/utils";

type CallStatus = "idle" | "connecting" | "in-call" | "ended";

interface TranscriptMessage {
  role: "agent" | "user";
  text: string;
  timestamp: string;
  latencyMs?: number;
}

interface VoicePlaygroundProps {
  voiceConfig: VoiceConfig;
  onVoiceConfigChange: (config: VoiceConfig) => void;
  agentName?: string;
  className?: string;
}

const samplePhrases = [
  "Hello, how can I help you today?",
  "Let me check that for you right away.",
  "Your appointment is confirmed for tomorrow.",
  "Is there anything else I can assist with?",
  "I'd be happy to schedule a demo call.",
];

const mockConversation: TranscriptMessage[] = [
  { role: "agent", text: "Hello! Welcome to Acme Corp. I'm your AI sales assistant. How can I help you today?", timestamp: "0:01", latencyMs: 320 },
  { role: "user", text: "Hi, I'm interested in learning more about your enterprise plan.", timestamp: "0:04" },
  { role: "agent", text: "Great choice! Our enterprise plan includes unlimited agents, priority support, and custom integrations. Would you like me to walk you through the key features?", timestamp: "0:06", latencyMs: 450 },
  { role: "user", text: "Yes please, especially the API access and analytics.", timestamp: "0:12" },
  { role: "agent", text: "Absolutely! With the enterprise plan, you get full API access with up to 10,000 requests per minute, real-time analytics dashboards, and detailed conversation transcripts with sentiment analysis. Shall I schedule a demo with our team?", timestamp: "0:15", latencyMs: 380 },
  { role: "user", text: "That sounds great. Can we do Thursday afternoon?", timestamp: "0:22" },
  { role: "agent", text: "Perfect! I've noted Thursday afternoon. Let me transfer you to our scheduling team to confirm the exact time. Thank you for your interest!", timestamp: "0:25", latencyMs: 290 },
];

export function VoicePlayground({ voiceConfig, onVoiceConfigChange, agentName = "Sales Bot", className }: VoicePlaygroundProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageIndexRef = useRef(0);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const update = (partial: Partial<VoiceConfig>) => onVoiceConfigChange({ ...voiceConfig, ...partial });

  const selectedVoice = elevenLabsVoices.find((v) => v.id === voiceConfig.voiceId);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Call timer
  useEffect(() => {
    if (callStatus === "in-call") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  // Simulated conversation playback
  useEffect(() => {
    if (callStatus !== "in-call") return;
    messageIndexRef.current = 0;

    const playNext = () => {
      if (messageIndexRef.current >= mockConversation.length) {
        setIsSpeaking(false);
        return;
      }
      const msg = mockConversation[messageIndexRef.current];
      if (msg.role === "agent") setIsSpeaking(true);
      setTranscript((prev) => [...prev, msg]);
      messageIndexRef.current++;

      setTimeout(() => {
        setIsSpeaking(false);
        setTimeout(playNext, 800 + Math.random() * 1200);
      }, msg.role === "agent" ? 1500 + msg.text.length * 20 : 800);
    };

    const timeout = setTimeout(playNext, 1500);
    return () => clearTimeout(timeout);
  }, [callStatus]);

  const startCall = useCallback(() => {
    setTranscript([]);
    setElapsed(0);
    setCallStatus("connecting");
    setTimeout(() => setCallStatus("in-call"), 1500);
  }, []);

  const endCall = useCallback(() => {
    setCallStatus("ended");
    setIsSpeaking(false);
    setTimeout(() => setCallStatus("idle"), 2000);
  }, []);

  const addSamplePhrase = (phrase: string) => {
    setTranscript((prev) => [
      ...prev,
      { role: "agent", text: phrase, timestamp: formatTime(elapsed), latencyMs: 200 + Math.floor(Math.random() * 300) },
    ]);
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 1200 + phrase.length * 15);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Phone Simulator */}
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full",
              callStatus === "idle" || callStatus === "ended" ? "bg-muted-foreground/40" :
              callStatus === "connecting" ? "bg-amber-500 animate-pulse" :
              "bg-emerald-500"
            )} />
            <span className="text-sm font-medium">{agentName}</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {callStatus === "idle" ? "Ready" :
             callStatus === "connecting" ? "Connecting..." :
             callStatus === "ended" ? "Call ended" :
             formatTime(elapsed)}
          </Badge>
        </div>

        {/* Waveform Visualizer */}
        <div className="flex items-center justify-center gap-1 h-16 rounded-xl bg-muted/50 px-4">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-150",
                isSpeaking
                  ? "bg-primary animate-pulse"
                  : callStatus === "in-call"
                  ? "bg-muted-foreground/20"
                  : "bg-muted-foreground/10"
              )}
              style={{
                height: isSpeaking
                  ? `${12 + Math.sin(i * 0.8 + Date.now() * 0.003) * 20 + Math.random() * 12}px`
                  : callStatus === "in-call" ? "6px" : "4px",
                animationDelay: `${i * 50}ms`,
                animationDuration: `${300 + (i % 5) * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10"
            disabled={callStatus !== "in-call"}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
          </Button>

          {callStatus === "idle" || callStatus === "ended" ? (
            <Button
              size="lg"
              className="rounded-full h-14 w-14 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={startCall}
            >
              <Phone className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10"
            disabled={callStatus !== "in-call"}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Metrics Bar */}
        {callStatus === "in-call" && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 340ms</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(elapsed)}</span>
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${(elapsed * 0.003).toFixed(3)}</span>
          </div>
        )}
      </div>

      {/* Inline Voice Tuner */}
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Voice Tuner</Label>
          <span className="text-xs text-muted-foreground">{selectedVoice?.name || "Custom"}</span>
        </div>

        <Select value={voiceConfig.voiceId} onValueChange={(v) => update({ voiceId: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {elevenLabsVoices.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">
                {v.name} · {v.gender} · {v.lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-y-3">
          {[
            { label: "Stability", key: "stability" as const, value: voiceConfig.stability },
            { label: "Similarity", key: "similarityBoost" as const, value: voiceConfig.similarityBoost },
            { label: "Style", key: "style" as const, value: voiceConfig.style },
          ].map((s) => (
            <div key={s.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-xs font-mono text-muted-foreground">{s.value[0]}%</span>
              </div>
              <Slider value={s.value} onValueChange={(v) => update({ [s.key]: v })} max={100} step={1} className="h-4" />
            </div>
          ))}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Speed</span>
              <span className="text-xs font-mono text-muted-foreground">{(voiceConfig.speed[0] / 100).toFixed(1)}x</span>
            </div>
            <Slider value={voiceConfig.speed} onValueChange={(v) => update({ speed: v })} min={70} max={120} step={1} className="h-4" />
          </div>
        </div>
      </div>

      {/* Live Transcript */}
      <div className="rounded-2xl border bg-card flex flex-col" style={{ minHeight: 200 }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
          <Label className="text-sm font-semibold">Transcript</Label>
          <span className="text-xs text-muted-foreground">{transcript.length} messages</span>
        </div>
        <ScrollArea className="flex-1 p-3" style={{ maxHeight: 280 }}>
          <div ref={scrollRef} className="space-y-2">
            {transcript.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Start a call to see the conversation transcript
              </p>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "agent"
                      ? "bg-primary/10 text-foreground rounded-tl-sm"
                      : "bg-muted text-foreground rounded-tr-sm"
                  )}>
                    <p>{msg.text}</p>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                      <span className="text-[10px]">{msg.timestamp}</span>
                      {msg.latencyMs && <span className="text-[10px]">{msg.latencyMs}ms</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Sample Phrases */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <Label className="text-sm font-semibold">Sample Phrases</Label>
        <div className="flex flex-wrap gap-1.5">
          {samplePhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => addSamplePhrase(phrase)}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Volume2 className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[180px]">{phrase}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
