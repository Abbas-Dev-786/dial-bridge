import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2, AlertCircle, Save } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { VoiceSettings, VoiceConfig } from "@/components/VoiceSettings";
import {
  ConversationFlowSettings,
  ConversationFlowConfig,
} from "@/components/ConversationFlowSettings";
import { ToolsConfig, ToolConfig } from "@/components/ToolsConfig";
import { VoicePlayground } from "@/components/VoicePlayground";
import { cn, getErrorMessage } from "@/lib/utils";
import { AgentHeader } from "@/components/agent-detail/AgentHeader";
import {
  AgentConfigCard,
  AgentActiveBanner,
} from "@/components/agent-detail/AgentConfigCard";
import { useAgentDetailQuery, useAgentMutations } from "@/hooks/api/useAgents";

export default function AgentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Form State
  const [agentData, setAgentData] = useState<any>(null);

  // Fetch Agent
  const {
    data: agent,
    isLoading,
    isError,
    error,
  } = useAgentDetailQuery(id);
  
  const { updateAgent, deleteAgent } = useAgentMutations(id);

  // Initialize form state from fetched data
  useEffect(() => {
    if (agent) {
      // Convert backend structure to frontend structure
      const v = agent.voice_config;
      const c = agent.conversation_config;

      const mappedTools: ToolConfig = {
        systemTools: agent.tools
          .filter((t: any) => t.tool_type === "system" && t.is_enabled)
          .map((t: any) => t.name),
        clientTools: agent.tools
          .filter((t: any) => t.tool_type === "client" && t.is_enabled)
          .map((t: any) => t.name),
        serverTools: agent.tools
          .filter((t: any) => t.tool_type === "server")
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || "",
            url: t.url || "",
            method: t.http_method || "POST",
            headers: JSON.stringify(t.headers || {}, null, 2),
          })),
      };

      setAgentData({
        name: agent.name,
        llm_model: agent.llm_model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        system_prompt: agent.system_prompt || "",
        first_message: agent.first_message || "",
        voice: {
          voiceId: v?.voice_id || "EXAVITQu4vr4xnSDxMaL",
          stability: [v?.stability ?? 50],
          similarityBoost: [v?.similarity_boost ?? 75],
          style: [v?.style ?? 0],
          speed: [v?.speed ?? 100],
        },
        flow: {
          firstMessage: agent.first_message || "",
          language: c?.language || "en",
          maxDuration: (c?.max_duration_seconds || 300).toString(),
          endCallAfterSilence: (
            c?.end_call_after_silence_secs || 30
          ).toString(),
          interruptionSensitivity: c?.interruption_sensitivity || "medium",
          turnEndpointDelay: (c?.turn_endpoint_delay_ms || 500).toString(),
          enableBackchannel: c?.enable_backchannel ?? true,
          enableDataCollection: c?.enable_data_collection ?? false,
          dataCollectionFields: JSON.stringify(
            c?.data_collection_fields || [],
            null,
            2,
          ),
        },
        tools: mappedTools,
      });
    }
  }, [agent]);

  // Mutations
  const handleSave = () => {
    const payload = {
      name: agentData.name,
      llm_model: agentData.llm_model,
      system_prompt: agentData.system_prompt,
      first_message: agentData.voice.firstMessage || agentData.flow.firstMessage,
      temperature: agentData.temperature,
      max_tokens: agentData.max_tokens,
      voice_config: {
        voice_id: agentData.voice.voiceId,
        stability: agentData.voice.stability[0],
        similarity_boost: agentData.voice.similarityBoost[0],
        style: agentData.voice.style[0],
        speed: agentData.voice.speed[0],
      },
      conversation_config: {
        language: agentData.flow.language,
        max_duration_seconds: parseInt(agentData.flow.maxDuration),
        end_call_after_silence_secs: parseInt(agentData.flow.endCallAfterSilence),
        interruption_sensitivity: agentData.flow.interruptionSensitivity,
        turn_endpoint_delay_ms: parseInt(agentData.flow.turnEndpointDelay),
        enable_backchannel: agentData.flow.enableBackchannel,
        enable_data_collection: agentData.flow.enableDataCollection,
        data_collection_fields: agentData.flow.dataCollectionFields
          ? JSON.parse(agentData.flow.dataCollectionFields)
          : [],
      },
      tools: [
        ...agentData.tools.systemTools.map((name: string) => ({
          name,
          tool_type: "system",
          is_enabled: true,
        })),
        ...agentData.tools.clientTools.map((name: string) => ({
          name,
          tool_type: "client",
          is_enabled: true,
        })),
        ...agentData.tools.serverTools.map((t: any) => ({
          name: t.name,
          description: t.description,
          tool_type: "server",
          url: t.url,
          http_method: t.method,
          headers: t.headers ? JSON.parse(t.headers) : {},
          is_enabled: true,
        })),
      ],
    };

    updateAgent.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Changes saved",
          description: "Agent configuration has been updated.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Error saving changes",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = () => {
    deleteAgent.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Agent deleted",
          description: "The agent has been permanently removed.",
        });
        navigate("/agents");
      },
      onError: (err: any) => {
        toast({
          title: "Error deleting agent",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      }
    });
  };

  const handleUpdate = (field: string, value: any) => {
    setAgentData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading || !agentData) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading agent configuration...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            Failed to load agent
          </h3>
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/agents")}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const isActive = !!agent.active_campaign_id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <AgentHeader
        id={id || ""}
        name={agentData.name}
        status={agent.status}
        onTest={() => setDrawerOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      {isActive && <AgentActiveBanner campaign={agent.active_campaign_name} />}

      <AgentConfigCard
        isActive={isActive}
        name={agentData.name}
        model={agentData.llm_model}
        temperature={agentData.temperature}
        maxTokens={agentData.max_tokens}
        prompt={agentData.system_prompt}
        onChange={handleUpdate}
      />

      {/* Voice Settings Card — Collapsible */}
      <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors select-none">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Voice Settings</CardTitle>
                  <CardDescription>
                    Voice provider, language, and speech configuration.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    voiceOpen && "rotate-180",
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-300">
            <CardContent
              className={cn(
                "pt-0",
                isActive && "pointer-events-none opacity-60",
              )}
            >
              <div className="pt-4 border-t">
                <VoiceSettings
                  config={agentData.voice}
                  onChange={(v) => handleUpdate("voice", v)}
                />
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
                  <CardDescription>
                    Greeting, interruption handling, and flow behavior.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    conversationOpen && "rotate-180",
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-300">
            <CardContent
              className={cn(
                "pt-0",
                isActive && "pointer-events-none opacity-60",
              )}
            >
              <div className="pt-4 border-t">
                <ConversationFlowSettings
                  config={agentData.flow}
                  onChange={(f) => handleUpdate("flow", f)}
                />
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
                  <CardDescription>
                    External tools and function calls available to the agent.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    toolsOpen && "rotate-180",
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-300">
            <CardContent
              className={cn(
                "pt-0",
                isActive && "pointer-events-none opacity-60",
              )}
            >
              <div className="pt-4 border-t">
                <ToolsConfig
                  config={agentData.tools}
                  onChange={(t) => handleUpdate("tools", t)}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button
          disabled={isActive || updateAgent.isPending}
          size="lg"
          className="px-8"
          onClick={handleSave}
        >
          {updateAgent.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Voice Playground Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">Voice Playground</DrawerTitle>
          <div className="overflow-y-auto p-4 pb-8">
            <VoicePlayground
              voiceConfig={agentData.voice}
              onVoiceConfigChange={(v) => handleUpdate("voice", v)}
              agentName={agentData.name}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Agent"
        description={`Are you sure you want to delete ${agentData.name}? This will stop all active campaigns using this agent. This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
