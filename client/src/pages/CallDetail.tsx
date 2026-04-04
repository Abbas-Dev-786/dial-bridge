import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Flag } from "lucide-react";
import { CallMetadataCard } from "@/components/call-detail/CallMetadataCard";
import { CallAudioPlayer, CallTranscript } from "@/components/call-detail/CallTranscript";

const metadata = {
  contact: "+1 (555) 123-4567",
  agent: "Sales Bot",
  agentId: "agent_abc123",
  direction: "Outbound",
  date: "Mar 7, 2026, 2:34 PM",
  duration: "3:42",
  status: "live" as const,
  conversationId: "conv_1a2b3c4d",
  model: "GPT-4o",
  voice: "Sarah",
  language: "English",
};

const costBreakdown = [
  { label: "LLM (GPT-4o)", value: "$0.06" },
  { label: "TTS (Voice)", value: "$0.03" },
  { label: "Telephony", value: "$0.03" },
  { label: "Total", value: "$0.12", bold: true },
];

const evaluations = [
  { criteria: "Qualified the lead", passed: true },
  { criteria: "Booked a demo", passed: true },
  { criteria: "Mentioned pricing", passed: false },
  { criteria: "Stayed on script", passed: true },
  { criteria: "Handled objections", passed: true },
];

const transcript = [
  { speaker: "agent", text: "Hello! This is Alex from Acme Corp. Am I speaking with John?", time: "0:00", latency: "—" },
  { speaker: "user", text: "Yes, this is John. What's this about?", time: "0:04", latency: "—" },
  { speaker: "agent", text: "Great! I'm reaching out because you expressed interest in our enterprise solution. I wanted to see if you had a few minutes to discuss how we can help streamline your operations.", time: "0:07", latency: "180ms" },
  { speaker: "user", text: "Sure, I've got about 5 minutes. What can you tell me?", time: "0:18", latency: "—" },
  { speaker: "agent", text: "Our platform handles automated customer calls, qualification, and scheduling. Most of our clients see a 40% reduction in manual outreach time. Would you like me to schedule a demo with our solutions team?", time: "0:22", latency: "165ms" },
  { speaker: "user", text: "That sounds promising. Can we do Thursday afternoon?", time: "0:35", latency: "—" },
  { speaker: "tool", text: "[calendar.check_availability] → Available: Thursday 2:00 PM ✓", time: "0:36", latency: "320ms" },
  { speaker: "agent", text: "Thursday at 2 PM works perfectly. I've booked that for you. You'll receive a confirmation email shortly. Is there anything else I can help with?", time: "0:38", latency: "155ms" },
  { speaker: "user", text: "No, that's all. Thanks!", time: "0:48", latency: "—" },
  { speaker: "agent", text: "Thank you, John! Have a great day.", time: "0:50", latency: "140ms" },
];

const collectedData = [
  { field: "Name", value: "John" },
  { field: "Interest Level", value: "High" },
  { field: "Meeting Booked", value: "Thursday 2:00 PM" },
  { field: "Objections", value: "None" },
];

export default function CallDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/calls")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conversation Detail</h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wider">{metadata.conversationId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
             Share
          </Button>
          <Button variant="outline" size="sm">
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
            <Button variant="secondary" size="sm" className="w-full">
              <Download className="mr-2 h-3.5 w-3.5" /> Download Recording
            </Button>
            <Button variant="secondary" size="sm" className="w-full">
              <Flag className="mr-2 h-3.5 w-3.5" /> Flag for Review
            </Button>
          </div>
        </div>

        {/* Right Column — Transcript & Player */}
        <div className="lg:col-span-3 space-y-4">
          <CallAudioPlayer duration={metadata.duration} />
          <CallTranscript transcript={transcript} />
        </div>
      </div>
    </div>
  );
}
