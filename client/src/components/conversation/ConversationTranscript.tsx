import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bot, User, ThumbsUp, ThumbsDown, Mic, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptMessage } from "@/hooks/useConversationSession";
import { useState } from "react";

interface ConversationTranscriptProps {
  transcript: TranscriptMessage[];
  isSpeaking?: boolean;
  isConnected?: boolean;
  canSendFeedback?: boolean;
  onFeedback?: (like: boolean) => void;
  agentName?: string;
  className?: string;
}

export function ConversationTranscript({
  transcript,
  isSpeaking = false,
  isConnected = false,
  canSendFeedback = false,
  onFeedback,
  agentName = "Agent",
  className,
}: ConversationTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Track if user scrolled away from bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={cn("flex flex-col relative", className)}>
      <ScrollArea
        className="flex-1 px-4 py-3"
        onScrollCapture={handleScroll}
      >
        <div ref={scrollRef} className="space-y-4 pb-2">
          {transcript.length === 0 && !isConnected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Mic className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Ready to talk
              </h3>
              <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                Start a conversation to see the real-time transcript appear here
              </p>
            </div>
          ) : transcript.length === 0 && isConnected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Listening...
              </h3>
              <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                Speak naturally — your conversation will be transcribed in real time
              </p>
            </div>
          ) : (
            transcript.map((msg, index) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                    msg.role === "agent"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {msg.role === "agent" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={cn(
                    "max-w-[75%] space-y-1",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "agent"
                        ? "bg-card border border-border rounded-tl-md"
                        : "bg-primary text-primary-foreground rounded-tr-md"
                    )}
                  >
                    <p>{msg.text}</p>
                  </div>

                  {/* Meta row */}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-1",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                      {msg.role === "agent" ? agentName : "You"}
                    </span>
                    {msg.timestamp && msg.timestamp !== "final" && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                          {msg.timestamp}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Feedback buttons on last agent message */}
                  {canSendFeedback &&
                    msg.role === "agent" &&
                    index === transcript.length - 1 && (
                      <div className="flex items-center gap-1 px-1 animate-in fade-in duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                          onClick={() => onFeedback?.(true)}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onFeedback?.(false)}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            ))
          )}

          {/* Speaking indicator */}
          {isSpeaking && isConnected && (
            <div className="flex gap-3 animate-in fade-in duration-200">
              <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                      style={{
                        animationDelay: `${i * 150}ms`,
                        animationDuration: "0.8s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full shadow-lg bg-background/95 backdrop-blur-sm animate-in zoom-in duration-200"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
