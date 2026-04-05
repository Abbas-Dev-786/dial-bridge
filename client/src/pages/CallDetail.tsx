import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Flag, Share2 } from "lucide-react";
import { CallMetadataCard } from "@/components/call-detail/CallMetadataCard";
import { CallAudioPlayer, CallTranscript } from "@/components/call-detail/CallTranscript";
import { workspaceRequest } from "@/lib/api";
import { formatCentsToDollars, formatSecondsToDuration, formatDate } from "@/lib/utils";

export default function CallDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [call, setCall] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCallDetail();
    }
  }, [id]);

  const fetchCallDetail = async () => {
    setIsLoading(true);
    try {
      const [callRes, transcriptRes, recordingRes] = await Promise.all([
        workspaceRequest.get<any>(`/calls/${id}`),
        workspaceRequest.get<any[]>(`/calls/${id}/transcript`),
        workspaceRequest.get<{ url: string }>(`/calls/${id}/recording`),
      ]);

      setCall(callRes.data);
      setTranscript(transcriptRes.data);
      setRecordingUrl(recordingRes.data.url);
    } catch (error) {
      console.error("Failed to fetch call detail", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Fetching conversation records...</p>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-xl font-semibold">Call not found</h2>
        <Button onClick={() => navigate("/calls")}>Back to Call Logs</Button>
      </div>
    );
  }

  const metadata = {
    contact: call.contact_phone || call.from_number,
    agent: call.agent_name || "Unknown Agent",
    agentId: call.agent_id,
    direction: call.direction,
    date: formatDate(call.created_at),
    duration: formatSecondsToDuration(call.duration_seconds || 0),
    status: call.status,
    conversationId: call.id,
    model: "ElevenLabs AI", // Placeholder as it's not in the response yet
    voice: "Standard", // Placeholder
    language: "English", // Placeholder
  };

  const costBreakdown = [
    { label: "LLM", value: formatCentsToDollars(call.cost_llm_cents || 0) },
    { label: "TTS (Voice)", value: formatCentsToDollars(call.cost_tts_cents || 0) },
    { label: "Telephony", value: formatCentsToDollars(call.cost_telephony_cents || 0) },
    { label: "STT", value: formatCentsToDollars(call.cost_stt_cents || 0) },
    { label: "Total", value: formatCentsToDollars(call.total_cost_cents || 0), bold: true },
  ];

  const evaluations = call.evaluations.map((e: any) => ({
    criteria: e.criteria,
    passed: e.passed,
    score: e.score,
  }));

  const collectedData = call.collected_data.map((d: any) => ({
    field: d.field_key,
    value: d.field_value,
  }));

  const formattedTranscript = transcript.map((t: any) => ({
    speaker: t.speaker.toLowerCase(),
    text: t.text,
    time: t.timestamp_secs ? formatSecondsToDuration(Math.floor(t.timestamp_secs)) : "—",
    latency: t.latency_ms ? `${t.latency_ms}ms` : "—",
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 px-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/calls")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conversation Detail</h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider">{call.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
             <Share2 className="mr-2 h-3.5 w-3.5" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(recordingUrl || "#")}>
            <Download className="mr-2 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column — Metadata */}
        <div className="lg:col-span-2 space-y-4">
          <CallMetadataCard 
            metadata={metadata} 
            costBreakdown={costBreakdown} 
            evaluations={evaluations} 
            collectedData={collectedData} 
          />

          <div className="flex flex-col gap-2">
            <Button 
                variant="secondary" 
                size="sm" 
                className="w-full" 
                onClick={() => recordingUrl && window.open(recordingUrl)}
                disabled={!recordingUrl}
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Download Recording
            </Button>
            <Button variant="secondary" size="sm" className="w-full text-destructive hover:text-destructive">
              <Flag className="mr-2 h-3.5 w-3.5" /> Flag for Review
            </Button>
          </div>
        </div>

        {/* Right Column — Transcript & Player */}
        <div className="lg:col-span-3 space-y-4">
          <CallAudioPlayer 
            src={recordingUrl || undefined} 
            duration={call.duration_seconds} 
          />
          <CallTranscript transcript={formattedTranscript} />
        </div>
      </div>
    </div>
  );
}
