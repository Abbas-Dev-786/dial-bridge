import { useState, useEffect, useRef, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { useAgentTest } from "@/hooks/api/useAgentTest";

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

  // Sync SDK status to get conversation ID on connect
  useEffect(() => {
    if (sdkStatus === "connected" && !conversationId) {
      const id = conversation.getId();
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        conversation.endSession();
      } catch {
        // ignore cleanup errors
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, []);

  const startSession = useCallback(async () => {
    try {
      if (!agentId) {
        throw new Error("Agent has not been synced with ElevenLabs yet.");
      }

      setTranscript([]);
      setElapsed(0);
      setConversationId(null);
      setSessionStatus("connecting");
      msgIdRef.current = 0;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      connectionTimeoutRef.current = setTimeout(() => {
        setSessionStatus((current) => {
          if (current !== "connected") {
            onError?.("Timed out while connecting to ElevenLabs agent.");
            return "error";
          }
          return current;
        });
      }, 20000);

      const sessionData = await startTestSignedUrlSession.mutateAsync();

      // Authenticated WebSocket mode: backend generates the short-lived
      // ElevenLabs signed URL so we avoid LiveKit/WebRTC data-channel failures.
      // Connection status is tracked
      // via onConnect/onDisconnect callbacks above.
      // startSession returns void in v1.0.3.
      conversation.startSession({
        signedUrl: sessionData.signed_url,
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
  }, [agentId, startTestSignedUrlSession, conversation, onError]);

  const endSession = useCallback(() => {
    try {
      conversation.endSession();
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, [conversation]);

  const toggleMute = useCallback(() => {
    conversation.setMuted(!isMuted);
  }, [conversation, isMuted]);

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim() || sessionStatus !== "connected") return;
      conversation.sendUserMessage(text);
    },
    [conversation, sessionStatus],
  );

  const sendActivity = useCallback(() => {
    if (sessionStatus === "connected") {
      conversation.sendUserActivity();
    }
  }, [conversation, sessionStatus]);

  const sendFeedback = useCallback(
    (like: boolean) => {
      conversation.sendFeedback(like);
    },
    [conversation],
  );

  // Audio frequency data for visualization — SYNCHRONOUS per SDK docs
  const getInputFrequencyData = useCallback((): Uint8Array | undefined => {
    try {
      return conversation.getInputByteFrequencyData();
    } catch {
      return undefined;
    }
  }, [conversation]);

  const getOutputFrequencyData = useCallback((): Uint8Array | undefined => {
    try {
      return conversation.getOutputByteFrequencyData();
    } catch {
      return undefined;
    }
  }, [conversation]);

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
  };
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
