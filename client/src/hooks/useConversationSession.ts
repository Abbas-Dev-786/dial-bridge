import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { useAgentTest } from "@/hooks/api/useAgentTest";
import { workspaceRequest } from "@/lib/api";

export interface TranscriptMessage {
  id: string;
  role: "agent" | "user";
  text: string;
  timestamp: string;
  isFinal?: boolean;
}

export type ConversationMode = "voice" | "text";
export type SessionStatus =
  | "idle"
  | "requesting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseConversationSessionOptions {
  agentId?: string;
  onError?: (error: string) => void;
}

/**
 * High-level hook that wraps `useConversation` from @elevenlabs/react
 * with our backend token endpoint, transcript management, and call timer.
 *
 * Uses `useConversation` (not granular hooks) because we NEED the `onMessage`
 * callback to build the real-time transcript — granular hooks don't expose it.
 */
export function useConversationSession({
  agentId,
  onError,
}: UseConversationSessionOptions) {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<ConversationMode>("voice");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgIdRef = useRef(0);
  const elapsedRef = useRef(0);

  // Keep elapsed in a ref so onMessage closure always has the latest value
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const { startTestSignedUrlSession, useTestConversation } = useAgentTest(agentId);

  // useConversation — the convenience hook that includes onMessage callback
  const conversation = useConversation({
    onConnect: ({ conversationId: connectedConversationId }: { conversationId?: string } = {}) => {
      console.log("ElevenLabs: Connected", connectedConversationId);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (connectedConversationId) {
        setConversationId(connectedConversationId);
      }
      setSessionStatus("connected");
    },
    onDisconnect: (details: unknown) => {
      console.log("ElevenLabs: Disconnected", details);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setSessionStatus("disconnected");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    },
    onMessage: (message: any) => {
      const newMsg: TranscriptMessage = {
        id: `msg-${++msgIdRef.current}`,
        role: message.source === "ai" ? "agent" : "user",
        text: message.message,
        timestamp: formatTime(elapsedRef.current),
        isFinal: true,
      };
      setTranscript((prev) => [...prev, newMsg]);
    },
    onError: (error: any) => {
      console.error("ElevenLabs conversation error:", error);
      if (sessionStatus === "connected") {
        onError?.(
          typeof error === "string"
            ? error
            : error?.message || "ElevenLabs conversation error",
        );
        return;
      }
      // LiveKit can emit a v1-path probe error and then successfully retry.
      // Startup failure is handled by status changes plus our timeout below.
    },
    onStatusChange: ({ status }: { status: string }) => {
      console.log("ElevenLabs status:", status);
      if (status === "connecting") {
        setSessionStatus("connecting");
      }
      if (status === "connected") {
        setSessionStatus("connected");
      }
      if (status === "disconnected" && sessionStatus !== "idle") {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        setSessionStatus("disconnected");
      }
    },
  });

  const { status: sdkStatus, isSpeaking, isMuted, canSendFeedback } = conversation;

  // Store conversation in a ref so callbacks are stable and never recreated.
  // useConversation returns a new object on every render, which would invalidate
  // all useCallback deps and cause the AudioVisualizer to restart its animation loop.
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  // Sync SDK status to get conversation ID on connect
  useEffect(() => {
    if (sdkStatus === "connected" && !conversationId) {
      const id = conversationRef.current.getId();
      if (id) setConversationId(id);
    }
  }, [sdkStatus, conversationId]);

  // Final conversation details (after disconnect)
  const { data: finalConversation, isLoading: isLoadingFinal } =
    useTestConversation(conversationId || undefined);

  // Call timer
  useEffect(() => {
    if (sessionStatus === "connected") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (
      sessionStatus !== "connecting" &&
      sessionStatus !== "requesting"
    ) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStatus]);

  // Update transcript from final conversation
  useEffect(() => {
    const transcriptData = finalConversation?.transcript;
    if (transcriptData && sessionStatus === "disconnected") {
      const mapped: TranscriptMessage[] = transcriptData.map(
        (t: any, i: number) => ({
          id: `final-${i}`,
          role: t.role === "agent" ? "agent" : "user",
          text: t.message,
          timestamp: "final",
          isFinal: true,
        }),
      );
      setTranscript(mapped);
    }
  }, [finalConversation, sessionStatus]);

  // Fetch audio recording as authenticated blob URL
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioFetchError, setAudioFetchError] = useState<string | null>(null);

  const fetchAudioRecording = useCallback(async () => {
    if (!finalConversation?.audio_url || audioBlobUrl) return;
    
    setIsLoadingAudio(true);
    setAudioFetchError(null);
    try {
      const res = await workspaceRequest.get(
        finalConversation.audio_url.replace(/^\/api\/v1\/workspaces\/[^/]+/, ""),
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data as Blob);
      setAudioBlobUrl(url);
    } catch (err: any) {
      console.error("Failed to fetch conversation audio:", err);
      // If it's a 404, it means ElevenLabs hasn't processed it yet or it's unavailable
      if (err.response?.status === 404) {
        setAudioFetchError("Processing");
      } else {
        setAudioFetchError("Failed");
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, [finalConversation?.audio_url, audioBlobUrl]);

  useEffect(() => {
    if (sessionStatus === "disconnected" && finalConversation?.audio_url && !audioBlobUrl && !audioFetchError && !isLoadingAudio) {
      fetchAudioRecording();
    }
  }, [sessionStatus, finalConversation?.audio_url, audioBlobUrl, audioFetchError, isLoadingAudio, fetchAudioRecording]);

  useEffect(() => {
    // Cleanup blob URL on unmount or new session
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        conversationRef.current.endSession();
      } catch {
        // ignore cleanup errors
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, []);

  // ── Actions — all use conversationRef for stable references ──

  const startSession = useCallback(async () => {
    try {
      if (!agentId) {
        throw new Error("Agent has not been synced with ElevenLabs yet.");
      }

      setTranscript([]);
      setElapsed(0);
      setConversationId(null);
      setAudioBlobUrl(null);
      setSessionStatus("requesting");
      msgIdRef.current = 0;

      const sessionData = await startTestSignedUrlSession.mutateAsync();
      const signedUrl = sessionData.signed_url;

      setSessionStatus("connecting");
      
      conversationRef.current.startSession({
        signedUrl,
        connectionType: "websocket",
        dynamicVariables: {
          contact_name: "there",
          contact_phone: "",
          contact_company: "",
          campaign_name: "Test conversation",
        },
      });
    } catch (error: any) {
      console.error("Failed to start session:", error);
      setSessionStatus("error");
      onError?.(error?.message || "Failed to start conversation session");
    }
  }, [agentId, startTestSignedUrlSession, onError]);

  const endSession = useCallback(() => {
    try {
      conversationRef.current.endSession();
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    conversationRef.current.setMuted(!conversationRef.current.isMuted);
  }, []);

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      conversationRef.current.sendUserMessage(text);
    },
    [],
  );

  const sendActivity = useCallback(() => {
    conversationRef.current.sendUserActivity();
  }, []);

  const sendFeedback = useCallback(
    (like: boolean) => {
      conversationRef.current.sendFeedback(like);
    },
    [],
  );

  // Audio frequency data — stable callbacks using ref, never recreated.
  // This is critical: if these callbacks changed, the AudioVisualizer
  // would restart its requestAnimationFrame loop and cause audio glitches.
  const getInputFrequencyData = useCallback((): Uint8Array | undefined => {
    try {
      return conversationRef.current.getInputByteFrequencyData();
    } catch {
      return undefined;
    }
  }, []);

  const getOutputFrequencyData = useCallback((): Uint8Array | undefined => {
    try {
      return conversationRef.current.getOutputByteFrequencyData();
    } catch {
      return undefined;
    }
  }, []);

  // Combined frequency getter — always stable, picks input or output internally
  const getFrequencyData = useCallback((): Uint8Array | undefined => {
    try {
      const conv = conversationRef.current;
      return conv.isSpeaking
        ? conv.getOutputByteFrequencyData()
        : conv.getInputByteFrequencyData();
    } catch {
      return undefined;
    }
  }, []);

  return {
    // State
    transcript,
    elapsed,
    isMuted,
    mode,
    sessionStatus,
    conversationId,
    isSpeaking,
    sdkStatus,
    canSendFeedback,
    finalConversation,
    isLoadingFinal,
    audioBlobUrl,
    isLoadingAudio,
    audioFetchError,

    // Actions
    startSession,
    endSession,
    toggleMute,
    setMode,
    sendTextMessage,
    sendActivity,
    sendFeedback,
    getInputFrequencyData,
    getOutputFrequencyData,
    getFrequencyData,
    fetchAudioRecording,
  };
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
