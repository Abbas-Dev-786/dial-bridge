import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  Bot,
  Loader2,
  AlertCircle,
  Clock,
  MessageSquare,
  Phone,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { useAgentDetailQuery } from "@/hooks/api/useAgents";
import {
  useConversationHistoryQuery,
  useConversationDetailQuery,
} from "@/hooks/api/useConversationHistory";
import { cn, getErrorMessage } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { workspaceRequest } from "@/lib/api";

function formatDate(unixSecs: number): string {
  const d = new Date(unixSecs * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AgentConversationHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: agent, isLoading: isLoadingAgent } = useAgentDetailQuery(id);
  const { data: historyData, isLoading: isLoadingHistory, isError, error } = useConversationHistoryQuery(id);
  const { data: conversationDetail, isLoading: isLoadingDetail } = useConversationDetailQuery(id, selectedConversationId || undefined);

  const conversations = historyData?.conversations || [];

  // Fetch audio recording as authenticated blob URL
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioFetchError, setAudioFetchError] = useState<string | null>(null);

  // Audio playback tracking for transcript highlighting
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Track the currently active message index for auto-scrolling
  const activeMessageIndexRef = useRef<number>(-1);

  // Auto-scroll logic
  useEffect(() => {
    if (!isPlaying || !conversationDetail?.transcript) return;

    const transcript = conversationDetail.transcript;
    const activeIndex = transcript.findIndex((msg: any, i: number) => {
      const timeInCall = msg.time_in_call_secs || 0;
      const nextMsg = transcript[i + 1];
      const nextTimeInCall = nextMsg ? (nextMsg.time_in_call_secs || 0) : Infinity;
      return audioCurrentTime >= timeInCall && audioCurrentTime < nextTimeInCall;
    });

    // Only scroll if the active message has changed to avoid interrupting manual scroll
    if (activeIndex !== -1 && activeIndex !== activeMessageIndexRef.current) {
      activeMessageIndexRef.current = activeIndex;
      const el = document.getElementById(`transcript-msg-${activeIndex}`);
      if (el) {
        // Find the closest scrollable container (our ScrollArea viewport)
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [audioCurrentTime, isPlaying, conversationDetail?.transcript]);

  const fetchAudioRecording = useCallback(async () => {
    if (!conversationDetail?.audio_url) return;
    
    setIsLoadingAudio(true);
    setAudioFetchError(null);
    try {
      const res = await workspaceRequest.get(
        conversationDetail.audio_url.replace(/^\/api\/v1\/workspaces\/[^/]+/, ""),
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data as Blob);
      setAudioBlobUrl(url);
    } catch (err: any) {
      console.error("Failed to fetch conversation audio:", err);
      if (err.response?.status === 404) {
        setAudioFetchError("Processing");
      } else {
        setAudioFetchError("Failed");
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, [conversationDetail?.audio_url]);

  // Reset audio state when selecting a different conversation
  useEffect(() => {
    setAudioBlobUrl(null);
    setAudioFetchError(null);
    setAudioCurrentTime(0);
    setIsPlaying(false);
    activeMessageIndexRef.current = -1;
    if (conversationDetail?.audio_url) {
      fetchAudioRecording();
    }
    
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, conversationDetail?.audio_url]);

  if (isLoadingAgent) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/agents/${id}`)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Conversation History</h1>
              <p className="text-xs text-muted-foreground">{agent?.name || "Agent"}</p>
            </div>
          </div>
        </div>

        <Button
          variant="default"
          onClick={() => navigate(`/agents/${id}/chat`)}
          className="gap-2"
        >
          <Phone className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Conversation List */}
        <div className="lg:col-span-2 space-y-2">
          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-xl border p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-medium mb-1">No conversations yet</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Start a conversation with this agent to see the history here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2 pr-2">
                {conversations.map((conv) => {
                  const isSelected = selectedConversationId === conv.conversation_id;
                  const isSuccess = conv.call_successful === "true" || conv.status === "done";

                  return (
                    <button
                      key={conv.conversation_id}
                      onClick={() => setSelectedConversationId(conv.conversation_id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all hover:bg-muted/50",
                        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isSuccess ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="text-xs font-medium">
                            {conv.status === "done" ? "Completed" : conv.status}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono h-5 px-1.5">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {formatDuration(conv.duration_seconds)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(conv.start_time_unix_secs)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {conv.message_count || 0} messages
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-3 rounded-xl border bg-card">
          {!selectedConversationId ? (
            <div className="flex flex-col items-center justify-center h-96 text-center p-6">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Play className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-medium mb-1">Select a conversation</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Click on a conversation from the list to view its transcript
              </p>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : conversationDetail ? (
            <div className="flex flex-col h-full">
              {/* Detail header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Conversation Transcript</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {selectedConversationId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {conversationDetail.duration_seconds && (
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(conversationDetail.duration_seconds)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <ScrollArea className="flex-1 p-4" style={{ maxHeight: "calc(100vh - 20rem)" }}>
                <div className="space-y-4">
                  {(conversationDetail.transcript || []).map((msg: any, i: number) => {
                    // Determine if this message is currently being spoken
                    const timeInCall = msg.time_in_call_secs || 0;
                    const nextMsg = conversationDetail.transcript[i + 1];
                    const nextTimeInCall = nextMsg ? (nextMsg.time_in_call_secs || 0) : Infinity;
                    
                    const isActive = isPlaying && audioCurrentTime >= timeInCall && audioCurrentTime < nextTimeInCall;

                    return (
                      <div
                        key={i}
                        id={`transcript-msg-${i}`}
                        className={cn(
                          "flex gap-3 cursor-pointer group transition-all duration-300",
                          msg.role === "user" ? "flex-row-reverse" : "flex-row",
                          isActive ? "scale-[1.02]" : "hover:scale-[1.01]"
                        )}
                        onClick={() => {
                          if (audioRef.current && msg.time_in_call_secs !== undefined) {
                            audioRef.current.currentTime = msg.time_in_call_secs;
                            audioRef.current.play().catch(() => {});
                          }
                        }}
                      >
                        <div
                          className={cn(
                            "shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                            msg.role === "agent"
                              ? isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                              : isActive ? "bg-foreground text-background shadow-md" : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/20"
                          )}
                        >
                          {msg.role === "agent" ? (
                            <Bot className="h-3.5 w-3.5" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm transition-all duration-300",
                            msg.role === "agent"
                              ? isActive 
                                ? "bg-primary/10 border border-primary/30 rounded-tl-md shadow-sm" 
                                : "bg-muted/50 rounded-tl-md group-hover:bg-muted/80"
                              : isActive
                                ? "bg-primary text-primary-foreground border border-primary/50 rounded-tr-md shadow-sm"
                                : "bg-primary text-primary-foreground rounded-tr-md opacity-90 group-hover:opacity-100"
                          )}
                        >
                          <p className="leading-relaxed">{msg.message}</p>
                          <span className={cn(
                            "text-[9px] mt-1 block opacity-0 group-hover:opacity-100 transition-opacity",
                            msg.role === "agent" ? "text-muted-foreground" : "text-primary-foreground/70 text-right"
                          )}>
                            {formatDuration(timeInCall)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Audio player */}
              {conversationDetail.audio_url && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Volume2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Recording</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {isLoadingAudio ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </div>
                    ) : audioBlobUrl ? (
                      <audio
                        ref={audioRef}
                        controls
                        className="h-8 w-64"
                        src={audioBlobUrl}
                        onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {audioFetchError === "Processing" ? "Audio processing..." : "Audio unavailable"}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={fetchAudioRecording}
                          title="Retry fetching audio"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
