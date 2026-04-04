import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronLeft, Trash2, Phone, AlertTriangle, Bot, ChevronDown } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { VoiceSettings, defaultVoiceConfig } from "@/components/VoiceSettings";
import { ConversationFlowSettings, defaultConversationFlowConfig } from "@/components/ConversationFlowSettings";
import { ToolsConfig, defaultToolConfig } from "@/components/ToolsConfig";
import { WebWidgetConfig } from "@/components/WebWidgetConfig";
import { VoicePlayground } from "@/components/VoicePlayground";
import { cn } from "@/lib/utils";

const llmModels = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
];

const activeAgentCampaigns: Record<string, string> = {
  "1": "Q1 Outreach",
  "4": "Re-engagement",
};

export default function AgentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState(defaultVoiceConfig);
  const [flowConfig, setFlowConfig] = useState(defaultConversationFlowConfig);
  const [toolConfig, setToolConfig] = useState(defaultToolConfig);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const activeCampaign = activeAgentCampaigns[id || ""];
  const isActive = !!activeCampaign;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Sales Bot</h1>
                <StatusBadge status="live" />
              </div>
              <p className="text-xs text-muted-foreground font-mono">agent_{id}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            <Phone className="mr-2 h-4 w-4" /> Test Agent
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Campaign Banner */}
      {isActive && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">
              This agent is currently active in {activeCampaign}.
            </p>
            <p className="text-xs text-warning/80 mt-0.5">
              Some settings cannot be edited while the campaign is running.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
          <CardDescription>Core agent settings and system prompt.</CardDescription>
        </CardHeader>
        <CardContent className={cn(isActive && "pointer-events-none opacity-60")}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input defaultValue="Sales Bot" disabled={isActive} />
            </div>
            <div className="space-y-2">
              <Label>LLM Model</Label>
              <Select defaultValue="gpt-4o" disabled={isActive}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {llmModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input type="number" step="0.1" min="0" max="2" defaultValue="0.7" disabled={isActive} />
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input type="number" defaultValue="1024" disabled={isActive} />
            </div>
          </div>
          <div className="space-y-2 mt-6">
            <Label>System Prompt</Label>
            <Textarea
              defaultValue="You are a professional sales assistant for Acme Corp. Your goal is to qualify leads and schedule demo calls."
              className="min-h-[150px] font-mono text-sm"
              readOnly={isActive}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Settings Card — Collapsible */}
      <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Voice Settings</CardTitle>
                  <CardDescription>Voice provider, language, and speech configuration.</CardDescription>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", voiceOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={cn(isActive && "pointer-events-none opacity-60")}>
              <VoiceSettings config={voiceConfig} onChange={setVoiceConfig} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Conversation Flow Card — Collapsible */}
      <Collapsible open={conversationOpen} onOpenChange={setConversationOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Conversation Flow</CardTitle>
                  <CardDescription>Greeting, interruption handling, and flow behavior.</CardDescription>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", conversationOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={cn(isActive && "pointer-events-none opacity-60")}>
              <ConversationFlowSettings config={flowConfig} onChange={setFlowConfig} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tools Card — Collapsible */}
      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Tools</CardTitle>
                  <CardDescription>External tools and function calls available to the agent.</CardDescription>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", toolsOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={cn(isActive && "pointer-events-none opacity-60")}>
              <ToolsConfig config={toolConfig} onChange={setToolConfig} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Deploy Card — Always Open */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deploy</CardTitle>
          <CardDescription>Web widget embed code and deployment options.</CardDescription>
        </CardHeader>
        <CardContent>
          <WebWidgetConfig agentId={id} />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button
          disabled={isActive}
          onClick={() => toast({ title: "Changes saved", description: "Agent configuration has been updated." })}
        >
          Save Changes
        </Button>
      </div>

      {/* Voice Playground Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">Voice Playground</DrawerTitle>
          <div className="overflow-y-auto p-4 pb-8">
            <VoicePlayground
              voiceConfig={voiceConfig}
              onVoiceConfigChange={setVoiceConfig}
              agentName="Sales Bot"
            />
          </div>
        </DrawerContent>
      </Drawer>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Agent"
        description="Are you sure you want to delete Sales Bot? This will stop all active campaigns using this agent. This action cannot be undone."
        onConfirm={() => { setDeleteOpen(false); navigate("/agents"); }}
      />
    </div>
  );
}
