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
} from "lucide-react";
import { useAgentDetailQuery } from "@/hooks/api/useAgents";
import {
  useConversationHistoryQuery,
  useConversationDetailQuery,
} from "@/hooks/api/useConversationHistory";
import { cn, getErrorMessage } from "@/lib/utils";
import { useState } from "react";

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
                  {(conversationDetail.transcript || []).map((msg: any, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div
                        className={cn(
                          "shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
                          msg.role === "agent"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
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
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                          msg.role === "agent"
                            ? "bg-muted/50 rounded-tl-md"
                            : "bg-primary text-primary-foreground rounded-tr-md"
                        )}
                      >
                        <p className="leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Audio player */}
              {conversationDetail.audio_url && (
                <div className="p-4 border-t">
                  <audio
                    controls
                    className="w-full h-8"
                    src={conversationDetail.audio_url}
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
