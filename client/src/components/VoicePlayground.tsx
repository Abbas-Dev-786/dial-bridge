import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Clock,
  Zap,
  DollarSign,
  Play,
  Square,
  Loader2,
  Save,
} from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import {
  VoiceConfig,
  ElevenLabsVoice,
  fallbackVoices,
} from "@/components/VoiceSettings";
import { useAgentTest } from "@/hooks/api/useAgentTest";
import { cn } from "@/lib/utils";

interface TranscriptMessage {
  role: "agent" | "user";
  text: string;
  timestamp: string;
  latencyMs?: number;
}

interface VoicePlaygroundProps {
  voiceConfig: VoiceConfig;
  onVoiceConfigChange: (config: VoiceConfig) => void;
  voices?: ElevenLabsVoice[];
  agentName?: string;
  agentId?: string;
  isDirty?: boolean;
  className?: string;
}

const samplePhrases = [
  "Hello, how can I help you today?",
  "Let me check that for you right away.",
  "Your appointment is confirmed for tomorrow.",
  "Is there anything else I can assist with?",
  "I'd be happy to schedule a demo call.",
];

export function VoicePlayground({
  voiceConfig,
  onVoiceConfigChange,
  voices,
  agentName = "Sales Bot",
  agentId,
  isDirty = false,
  className,
}: VoicePlaygroundProps) {
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const { startTestSession, useTestConversation } = useAgentTest(agentId);
  const { data: finalConversation, isLoading: isLoadingFinal } = useTestConversation(conversationId || undefined);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs");
    },
    onMessage: (message: { message: string; source: "ai" | "user" }) => {
      setTranscript((prev) => [
        ...prev,
        {
          role: message.source === "ai" ? "agent" : "user",
          text: message.message,
          timestamp: formatTime(elapsed),
        },
      ]);
    },
    onError: (error: string) => {
      console.error("ElevenLabs Error:", error);
    },
  });

  const { status: callStatus, isSpeaking } = conversation;

  const voiceList = voices && voices.length > 0 ? voices : fallbackVoices;

  const update = (partial: Partial<VoiceConfig>) =>
    onVoiceConfigChange({ ...voiceConfig, ...partial });

  const selectedVoice = voiceList.find(
    (v) => v.voice_id === voiceConfig.voiceId,
  );

  // Cleanup preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (conversation) {
        conversation.endSession();
      }
    };
  }, []);

  // Update transcript from final conversation details when available
  useEffect(() => {
    const transcriptData = finalConversation?.transcript;
    if (transcriptData) {
      const mapped: TranscriptMessage[] = transcriptData.map((t: any) => ({
        role: t.role === "agent" ? "agent" : "user",
        text: t.message,
        timestamp: "final",
      }));
      setTranscript(mapped);
    }
  }, [finalConversation]);

  // Auto-scroll transcript
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [transcript]);

  // Call timer
  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const startCall = useCallback(async () => {
    try {
      setTranscript([]);
      setElapsed(0);
      setConversationId(null);
      
      const sessionData = await startTestSession.mutateAsync();
      const token = sessionData.token;
      
      // Request microphone permission and start session
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      await conversation.startSession({
        conversationToken: token,
      });
      const convId = conversation.getId();
      if (convId) setConversationId(convId);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  }, [startTestSession, conversation]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    await conversation.setVolume({ volume: newMuted ? 0 : 1 });
    setIsMuted(newMuted);
  }, [conversation, isMuted]);

  const handleSendText = useCallback(async () => {
    if (!textInput.trim() || callStatus !== "connected") return;
    // For V1, the fallback says "typed interaction allowed".
    // ElevenLabs SDK doesn't directly support text injection in useConversation yet,
    // but we can add it to the local transcript for UX.
    setTranscript((prev) => [
      ...prev,
      {
        role: "user",
        text: textInput,
        timestamp: formatTime(elapsed),
      },
    ]);
    setTextInput("");
  }, [textInput, callStatus, elapsed]);

  const handlePreviewVoice = useCallback(() => {
    if (previewPlaying) {
      previewAudioRef.current?.pause();
      setPreviewPlaying(false);
      setPreviewLoading(false);
      return;
    }

    if (!selectedVoice?.preview_url) return;

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    setPreviewLoading(true);
    const audio = new Audio(selectedVoice.preview_url);
    previewAudioRef.current = audio;

    audio.addEventListener("canplaythrough", () => {
      setPreviewLoading(false);
      setPreviewPlaying(true);
      audio.play().catch(() => setPreviewPlaying(false));
    });

    audio.addEventListener("ended", () => {
      setPreviewPlaying(false);
    });

    audio.addEventListener("error", () => {
      setPreviewLoading(false);
      setPreviewPlaying(false);
    });

    audio.load();
  }, [previewPlaying, selectedVoice]);

  // Stop preview when voice changes
  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewPlaying(false);
      setPreviewLoading(false);
    }
  }, [voiceConfig.voiceId]);

  return (
    <div className={cn("flex flex-col gap-4 relative", className)}>
      {/* Dirty State Overlay */}
      {isDirty && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-primary/50 text-center p-6 transition-all animate-in fade-in duration-300">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <Save className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Save Changes to Test</h3>
          <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
            You have unsaved changes. Testing always uses the latest saved configuration of the agent.
          </p>
          <p className="text-xs font-medium text-primary">Please save your changes first</p>
        </div>
      )}

      {/* Phone Simulator */}
      <div className={cn(
        "rounded-2xl border bg-card p-4 space-y-4 transition-all duration-300",
        callStatus === "connected" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                callStatus === "disconnected" || callStatus === "error"
                  ? "bg-muted-foreground/40"
                  : callStatus === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-500",
              )}
            />
            <span className="text-sm font-medium">{agentName}</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {callStatus === "disconnected"
              ? "Ready"
              : callStatus === "connecting"
                ? "Connecting..."
                : callStatus === "error"
                  ? "Error"
                  : formatTime(elapsed)}
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
                  : callStatus === "connected"
                    ? "bg-muted-foreground/20"
                    : "bg-muted-foreground/10",
              )}
              style={{
                height: isSpeaking
                  ? `${12 + Math.sin(i * 0.8 + Date.now() * 0.003) * 20 + Math.random() * 12}px`
                  : callStatus === "connected"
                    ? "6px"
                    : "4px",
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
            className={cn(
              "rounded-full h-10 w-10",
              isMuted && "bg-destructive/10 border-destructive/50"
            )}
            disabled={callStatus !== "connected"}
            onClick={toggleMute}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4 text-destructive" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {callStatus === "disconnected" || callStatus === "error" ? (
            <Button
              size="lg"
              className="rounded-full h-14 w-14 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              onClick={startCall}
              disabled={startTestSession.isPending}
            >
              {startTestSession.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14 shadow-lg shadow-destructive/20 animate-in zoom-in duration-300"
              onClick={endCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10"
            disabled={callStatus !== "connected"}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Metrics Bar */}
        {(callStatus === "connected" || conversationId) && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" /> 
              {callStatus === "connected" ? "340ms" : "Done"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> 
              {isLoadingFinal ? "Processing..." : formatTime(finalConversation?.duration_seconds || elapsed)}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> 
              ${((finalConversation?.duration_seconds || elapsed) * 0.003).toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Inline Voice Tuner */}
      <div className={cn(
        "rounded-2xl border bg-card p-4 space-y-4",
        (callStatus === "connected" || isDirty) && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Voice Tuner</Label>
          <span className="text-xs text-muted-foreground">
            {selectedVoice?.name || "Custom"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={voiceConfig.voiceId}
            onValueChange={(v) => update({ voiceId: v })}
          >
            <SelectTrigger className="h-9 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voiceList.map((v) => {
                const gender = v.labels?.gender || "";
                const accent = v.labels?.accent || "";
                return (
                  <SelectItem
                    key={v.voice_id}
                    value={v.voice_id}
                    className="text-xs"
                  >
                    {v.name}
                    {gender || accent
                      ? ` · ${[gender, accent].filter(Boolean).join(" · ")}`
                      : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Preview Button */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 rounded-lg transition-all",
              previewPlaying &&
                "border-primary bg-primary/5 text-primary",
            )}
            disabled={!selectedVoice?.preview_url}
            onClick={handlePreviewVoice}
            title="Preview voice"
          >
            {previewLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : previewPlaying ? (
              <Square className="h-3 w-3 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 ml-0.5" />
            )}
          </Button>
        </div>

        <div className="space-y-3">
          {[
            {
              label: "Stability",
              key: "stability" as const,
              value: voiceConfig.stability,
            },
            {
              label: "Similarity",
              key: "similarityBoost" as const,
              value: voiceConfig.similarityBoost,
            },
            {
              label: "Style",
              key: "style" as const,
              value: voiceConfig.style,
            },
          ].map((s) => (
            <div key={s.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {s.label}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {s.value[0]}%
                </span>
              </div>
              <Slider
                value={s.value}
                onValueChange={(v) => update({ [s.key]: v })}
                max={100}
                step={1}
                className="h-4"
              />
            </div>
          ))}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Speed</span>
              <span className="text-xs font-mono text-muted-foreground">
                {(voiceConfig.speed[0] / 100).toFixed(1)}x
              </span>
            </div>
            <Slider
              value={voiceConfig.speed}
              onValueChange={(v) => update({ speed: v })}
              min={70}
              max={120}
              step={1}
              className="h-4"
            />
          </div>
        </div>
      </div>

      {/* Live Transcript */}
      <div
        className="rounded-2xl border bg-card flex flex-col"
        style={{ minHeight: 200 }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b">
          <Label className="text-sm font-semibold">Transcript</Label>
          <div className="flex items-center gap-2">
            {isLoadingFinal && (
              <span className="flex items-center gap-1 text-[10px] text-amber-500 animate-pulse font-medium">
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Finalizing...
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {transcript.length} messages
            </span>
          </div>
        </div>
        <ScrollArea className="flex-1 p-3" style={{ maxHeight: 280 }}>
          <div ref={scrollRef} className="space-y-2">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted p-3 rounded-full mb-3">
                  <Mic className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground max-w-[180px]">
                  Start a call to see the live conversation transcript
                </p>
              </div>
            ) : (
              transcript.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user"
                      ? "justify-end"
                      : "justify-start",
                    "animate-in slide-in-from-bottom-1 duration-200"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed transition-all",
                      msg.role === "agent"
                        ? "bg-primary/10 text-foreground rounded-tl-sm border border-primary/5"
                        : "bg-muted text-foreground rounded-tr-sm",
                    )}
                  >
                    <p>{msg.text}</p>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                      <span className="text-[10px] uppercase font-medium tracking-tight">{msg.role}</span>
                      <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                      <span className="text-[10px]">{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        {callStatus === "connected" && (
          <div className="p-3 border-t bg-muted/5">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Type a message..."
                className="flex-1 bg-background border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSendText}>
                <Zap className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recording Player (Final) */}
      {finalConversation?.audio_url && (
        <div className="rounded-2xl border bg-primary/5 p-4 flex items-center justify-between animate-in zoom-in duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold">Recording Available</p>
              <p className="text-[10px] text-muted-foreground">Listen to the full conversation</p>
            </div>
          </div>
          <audio controls className="h-8 w-48" src={finalConversation.audio_url} />
        </div>
      )}

      {/* Sample Phrases */}
      <div className={cn(
        "rounded-2xl border bg-card p-4 space-y-3",
        callStatus !== "connected" && "opacity-50 pointer-events-none"
      )}>
        <Label className="text-sm font-semibold">Sample Phrases</Label>
        <div className="flex flex-wrap gap-1.5">
          {samplePhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
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
