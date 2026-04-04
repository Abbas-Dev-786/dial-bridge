import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { VoiceSettings, defaultVoiceConfig } from "@/components/VoiceSettings";
import { ConversationFlowSettings, defaultConversationFlowConfig } from "@/components/ConversationFlowSettings";
import { ToolsConfig, defaultToolConfig } from "@/components/ToolsConfig";
import { WebWidgetConfig } from "@/components/WebWidgetConfig";
import { VoicePlayground } from "@/components/VoicePlayground";
import { cn } from "@/lib/utils";
import { ACTIVE_AGENT_CAMPAIGNS } from "@/lib/agent-constants";
import { AgentHeader } from "@/components/agent-detail/AgentHeader";
import { AgentConfigCard, AgentActiveBanner } from "@/components/agent-detail/AgentConfigCard";

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

  const activeCampaign = ACTIVE_AGENT_CAMPAIGNS[id || ""];
  const isActive = !!activeCampaign;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <AgentHeader 
        id={id || ""} 
        name="Sales Bot" 
        status="live" 
        onTest={() => setDrawerOpen(true)} 
        onDelete={() => setDeleteOpen(true)} 
      />

      {isActive && <AgentActiveBanner campaign={activeCampaign} />}

      <AgentConfigCard 
        isActive={isActive} 
        name="Sales Bot" 
        model="gpt-4o" 
        temperature={0.7} 
        maxTokens={1024} 
        prompt="You are a professional sales assistant for Acme Corp. Your goal is to qualify leads and schedule demo calls." 
      />

      {/* Voice Settings Card — Collapsible */}
      <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Voice Settings</CardTitle>
                  <CardDescription>Voice provider, language, and speech configuration.</CardDescription>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", voiceOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-300">
            <CardContent className={cn("pt-0", isActive && "pointer-events-none opacity-60")}>
              <div className="pt-4 border-t">
                <VoiceSettings config={voiceConfig} onChange={setVoiceConfig} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Conversation Flow Card — Collapsible */}
      <Collapsible open={conversationOpen} onOpenChange={setConversationOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Conversation Flow</CardTitle>
                  <CardDescription>Greeting, interruption handling, and flow behavior.</CardDescription>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", conversationOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-300">
            <CardContent className={cn("pt-0", isActive && "pointer-events-none opacity-60")}>
              <div className="pt-4 border-t">
                <ConversationFlowSettings config={flowConfig} onChange={setFlowConfig} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tools Card — Collapsible */}
      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Tools</CardTitle>
                  <CardDescription>External tools and function calls available to the agent.</CardDescription>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", toolsOpen && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-300">
            <CardContent className={cn("pt-0", isActive && "pointer-events-none opacity-60")}>
              <div className="pt-4 border-t">
                <ToolsConfig config={toolConfig} onChange={setToolConfig} />
              </div>
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
          size="lg"
          className="px-8"
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
