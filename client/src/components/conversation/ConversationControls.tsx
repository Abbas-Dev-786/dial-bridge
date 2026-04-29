import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/hooks/useConversationSession";

interface ConversationControlsProps {
  sessionStatus: SessionStatus;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isStarting?: boolean;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onSendText: (text: string) => void;
  onTextActivity?: () => void;
  className?: string;
}

export function ConversationControls({
  sessionStatus,
  isSpeaking = false,
  isMuted = false,
  isStarting = false,
  onStart,
  onEnd,
  onToggleMute,
  onSendText,
  onTextActivity,
  className,
}: ConversationControlsProps) {
  const [textInput, setTextInput] = useState("");

  const isConnected = sessionStatus === "connected";
  const isIdle = sessionStatus === "idle" || sessionStatus === "error" || sessionStatus === "disconnected";

  const handleSend = useCallback(() => {
    if (!textInput.trim()) return;
    onSendText(textInput.trim());
    setTextInput("");
  }, [textInput, onSendText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
    onTextActivity?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main call controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Mute Button */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full h-12 w-12 transition-all duration-200",
            isMuted && "bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20",
            !isConnected && "opacity-40 pointer-events-none"
          )}
          disabled={!isConnected}
          onClick={onToggleMute}
          id="mute-toggle-btn"
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Start / End Call Button */}
        {isIdle ? (
          <Button
            size="lg"
            className={cn(
              "rounded-full h-16 w-16 shadow-xl transition-all duration-300",
              "bg-emerald-600 hover:bg-emerald-700 text-white",
              "shadow-emerald-500/25 hover:shadow-emerald-500/40",
              "hover:scale-105 active:scale-95"
            )}
            onClick={onStart}
            disabled={isStarting}
            id="start-call-btn"
          >
            {isStarting ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Phone className="h-7 w-7" />
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="destructive"
            className={cn(
              "rounded-full h-16 w-16 shadow-xl transition-all duration-300",
              "shadow-destructive/25 hover:shadow-destructive/40",
              "hover:scale-105 active:scale-95",
              "animate-in zoom-in duration-300"
            )}
            onClick={onEnd}
            id="end-call-btn"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        )}

        {/* Spacer to balance layout */}
        <div className="h-12 w-12" />
      </div>

      {/* Status text */}
      <p className="text-center text-xs text-muted-foreground font-medium">
        {sessionStatus === "idle" && "Tap to start a voice conversation"}
        {sessionStatus === "requesting" && "Preparing session..."}
        {sessionStatus === "connecting" && "Connecting to agent..."}
        {sessionStatus === "connected" && !isSpeaking && "Listening to you..."}
        {sessionStatus === "connected" && isSpeaking && "Agent is speaking..."}
        {sessionStatus === "disconnected" && "Conversation ended"}
        {sessionStatus === "error" && "Connection error — tap to retry"}
      </p>

      {/* Text input — only visible when connected */}
      {isConnected && (
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 animate-in slide-in-from-bottom-2 duration-300">
          <input
            type="text"
            placeholder="Type a message (optional)..."
            value={textInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
            id="conversation-text-input"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            disabled={!textInput.trim()}
            onClick={handleSend}
            id="send-text-btn"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
