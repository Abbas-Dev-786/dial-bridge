import { lazy, Suspense, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Volume2, Zap, Clock, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAgentDetailQuery } from "@/hooks/api/useAgents";
import { useConversationSession } from "@/hooks/useConversationSession";
import { ConversationHeader } from "@/components/conversation/ConversationHeader";
import { MemoizedConversationTranscript } from "@/components/conversation/ConversationTranscript";
import { ConversationControls } from "@/components/conversation/ConversationControls";
import { MemoizedAudioVisualizer } from "@/components/conversation/AudioVisualizer";
import { cn, getErrorMessage } from "@/lib/utils";

const ConversationProvider = lazy(() =>
  import("@elevenlabs/react").then((module) => ({ default: module.ConversationProvider }))
);

/**
 * Inner component that uses the ElevenLabs SDK hooks.
 * Must be a child of ConversationProvider.
 */
function AgentConversationInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: agent,
    isLoading: isLoadingAgent,
    isError,
    error,
  } = useAgentDetailQuery(id);

  const session = useConversationSession({
    agentId: id,
    onError: (err) => {
      toast({
        title: "Conversation error",
        description: err,
        variant: "destructive",
      });
    },
  });

  const handleStart = useCallback(() => {
    session.startSession();
  }, [session]);

  const handleEnd = useCallback(() => {
    session.endSession();
  }, [session]);

  const handleSendText = useCallback(
    (text: string) => {
      session.sendTextMessage(text);
    },
    [session]
  );

  const handleFeedback = useCallback(
    (like: boolean) => {
      session.sendFeedback(like);
      toast({
        title: like ? "Positive feedback sent" : "Negative feedback sent",
        description: "Your feedback helps improve the agent.",
      });
    },
    [session, toast]
  );

  if (isLoadingAgent) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading agent...</p>
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Failed to load agent</h3>
          <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/agents")}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const isConnectedOrActive =
    session.sessionStatus === "connected" ||
    session.sessionStatus === "connecting" ||
    session.sessionStatus === "requesting";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
      {/* Header */}
      <ConversationHeader
        agentId={id || ""}
        agentName={agent.name}
        sessionStatus={session.sessionStatus}
        elapsed={session.elapsed}
        className="px-4 py-3 border-b"
      />

      {/* Audio Visualizer */}
      <div
        className={cn(
          "mx-4 mt-4 rounded-2xl overflow-hidden transition-all duration-500",
          isConnectedOrActive
            ? "h-24 bg-card border opacity-100"
            : "h-16 bg-muted/30 border border-dashed opacity-60"
        )}
      >
        <MemoizedAudioVisualizer
          getFrequencyData={session.getFrequencyData}
          isActive={session.sessionStatus === "connected"}
          isSpeaking={session.isSpeaking}
          variant="bars"
          barCount={48}
        />
      </div>

      {/* Transcript */}
      <MemoizedConversationTranscript
        transcript={session.transcript}
        isSpeaking={session.isSpeaking}
        isConnected={session.sessionStatus === "connected"}
        canSendFeedback={session.canSendFeedback}
        onFeedback={handleFeedback}
        agentName={agent.name}
        className="flex-1 min-h-0"
      />

      {/* Metrics Bar — visible during or after call */}
      {(session.sessionStatus === "connected" || session.conversationId) && (
        <div className="mx-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            {session.sessionStatus === "connected" ? "Live" : "Completed"}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {session.isLoadingFinal
              ? "Processing..."
              : `${Math.floor((session.finalConversation?.duration_seconds || session.elapsed) / 60)}:${((session.finalConversation?.duration_seconds || session.elapsed) % 60).toString().padStart(2, "0")}`}
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />$
            {((session.finalConversation?.duration_seconds || session.elapsed) * 0.003).toFixed(3)}
          </span>
        </div>
      )}

      {/* Recording Player — after conversation */}
      {session.sessionStatus === "disconnected" && session.finalConversation?.audio_url && (
        <div className="mx-4 mt-2 rounded-xl border bg-primary/5 p-3 flex items-center justify-between animate-in zoom-in duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-full">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold">Recording Available</p>
              <p className="text-[10px] text-muted-foreground">Full conversation audio</p>
            </div>
          </div>
          {session.isLoadingAudio ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          ) : session.audioBlobUrl ? (
            <audio
              controls
              className="h-8 w-44"
              src={session.audioBlobUrl}
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {session.audioFetchError === "Processing" ? "Audio processing..." : "Audio unavailable"}
              </p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={session.fetchAudioRecording}
                title="Retry fetching audio"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="px-4 py-5 border-t bg-background/80 backdrop-blur-sm">
        <ConversationControls
          sessionStatus={session.sessionStatus}
          isSpeaking={session.isSpeaking}
          isMuted={session.isMuted}
          isStarting={session.sessionStatus === "requesting" || session.sessionStatus === "connecting"}
          onStart={handleStart}
          onEnd={handleEnd}
          onToggleMute={session.toggleMute}
          onSendText={handleSendText}
          onTextActivity={session.sendActivity}
        />
      </div>
    </div>
  );
}

/**
 * Outer wrapper providing the ElevenLabs ConversationProvider context.
 * Callbacks are configured on the useConversation hook inside useConversationSession
 * to keep transcript management co-located with the onMessage handler.
 */
export default function AgentConversation() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ConversationProvider>
        <AgentConversationInner />
      </ConversationProvider>
    </Suspense>
  );
}
