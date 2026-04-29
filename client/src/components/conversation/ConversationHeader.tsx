import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Bot, Clock, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/hooks/useConversationSession";

interface ConversationHeaderProps {
  agentId: string;
  agentName: string;
  sessionStatus: SessionStatus;
  elapsed: number;
  className?: string;
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function ConversationHeader({
  agentId,
  agentName,
  sessionStatus,
  elapsed,
  className,
}: ConversationHeaderProps) {
  const navigate = useNavigate();

  const statusConfig: Record<SessionStatus, { label: string; dot: string }> = {
    idle: { label: "Ready", dot: "bg-muted-foreground/40" },
    requesting: { label: "Preparing...", dot: "bg-amber-500 animate-pulse" },
    connecting: { label: "Connecting...", dot: "bg-amber-500 animate-pulse" },
    connected: { label: "Connected", dot: "bg-emerald-500" },
    disconnected: { label: "Ended", dot: "bg-muted-foreground/40" },
    error: { label: "Error", dot: "bg-destructive" },
  };

  const { label, dot } = statusConfig[sessionStatus];

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate(`/agents/${agentId}`)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                dot
              )}
            />
          </div>

          <div>
            <h1 className="text-base font-semibold tracking-tight leading-tight">
              {agentName}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              {sessionStatus === "connected" && (
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-mono gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(elapsed)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => navigate(`/agents/${agentId}/history`)}
      >
        <History className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">History</span>
      </Button>
    </div>
  );
}
