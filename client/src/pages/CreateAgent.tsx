import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { VoiceSettings, defaultVoiceConfig, VoiceConfig } from "@/components/VoiceSettings";
import { ConversationFlowSettings, defaultConversationFlowConfig, ConversationFlowConfig } from "@/components/ConversationFlowSettings";
import { ToolsConfig, defaultToolConfig, ToolConfig } from "@/components/ToolsConfig";

const steps = ["LLM & Prompt", "Voice", "Conversation", "Tools", "Review"];

const llmModels = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "Best overall quality" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", description: "Fast & affordable" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", description: "Strong reasoning" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", description: "Ultra fast" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", description: "Large context window" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", description: "Speed optimized" },
  { id: "custom", name: "Custom LLM", provider: "Custom", description: "Bring your own endpoint" },
];

export default function CreateAgent() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0: LLM & Prompt
  const [agentName, setAgentName] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [customLlmUrl, setCustomLlmUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");

  // Step 1: Voice
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(defaultVoiceConfig);

  // Step 2: Conversation
  const [flowConfig, setFlowConfig] = useState<ConversationFlowConfig>(defaultConversationFlowConfig);

  // Step 3: Tools
  const [toolConfig, setToolConfig] = useState<ToolConfig>(defaultToolConfig);

  const insertVariable = (v: string) => {
    setSystemPrompt((prev) => prev + ` {{${v}}}`);
  };

  const canNext = () => {
    if (currentStep === 0) return agentName.trim().length > 0 && systemPrompt.trim().length > 0;
    return true;
  };

  const selectedModelInfo = llmModels.find((m) => m.id === selectedModel);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Agent</h1>
          <p className="text-sm text-muted-foreground">Configure a new ElevenLabs conversational AI agent</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center flex-1">
            <button
              onClick={() => i < currentStep && setCurrentStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                i === currentStep && "bg-primary text-primary-foreground",
                i < currentStep && "bg-primary/10 text-primary cursor-pointer",
                i > currentStep && "bg-muted text-muted-foreground"
              )}
            >
              {i < currentStep ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{step}</span>
            </button>
            {i < steps.length - 1 && <div className={cn("h-px flex-1 mx-1", i < currentStep ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input id="name" placeholder="e.g. Sales Assistant" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>LLM Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {llmModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">— {m.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedModel === "custom" && (
              <div className="space-y-2">
                <Label>Custom LLM Endpoint URL</Label>
                <Input placeholder="https://api.your-llm.com/v1/chat" value={customLlmUrl} onChange={(e) => setCustomLlmUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground">Must be compatible with the OpenAI Chat Completions API format.</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                <p className="text-xs text-muted-foreground">Higher = more creative, lower = more deterministic</p>
              </div>
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>System Prompt</Label>
                <Select onValueChange={insertVariable}>
                  <SelectTrigger className="w-auto h-8 text-xs">
                    <SelectValue placeholder="Insert Variable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_name">customer_name</SelectItem>
                    <SelectItem value="company">company</SelectItem>
                    <SelectItem value="product">product</SelectItem>
                    <SelectItem value="date">date</SelectItem>
                    <SelectItem value="call_id">call_id</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="You are a helpful sales assistant for {{company}}. Your goal is to..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{systemPrompt.length} characters</p>
            </div>
          </div>
        )}

        {currentStep === 1 && <VoiceSettings config={voiceConfig} onChange={setVoiceConfig} />}
        {currentStep === 2 && <ConversationFlowSettings config={flowConfig} onChange={setFlowConfig} />}
        {currentStep === 3 && <ToolsConfig config={toolConfig} onChange={setToolConfig} />}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review your agent</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{agentName || "—"}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">LLM Model</p>
                <p className="font-medium">{selectedModelInfo?.name || "—"}</p>
                <p className="text-xs text-muted-foreground">{selectedModelInfo?.provider}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Voice</p>
                <p className="font-medium">Voice ID: {voiceConfig.voiceId.slice(0, 12)}...</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="font-medium">{flowConfig.language.toUpperCase()}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">First Message</p>
                <p className="font-medium text-sm">{flowConfig.firstMessage || "None set"}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Tools</p>
                <p className="font-medium">
                  {toolConfig.systemTools.length + toolConfig.clientTools.length + toolConfig.serverTools.length} configured
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">System Prompt</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{systemPrompt || "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate("/agents")}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {currentStep === 0 ? "Cancel" : "Back"}
        </Button>
        <div className="flex gap-2">
          {currentStep === 4 && (
            <Button variant="outline" onClick={() => navigate(`/agents/1/playground`)}>Test in Playground</Button>
          )}
          <Button
            onClick={() => currentStep < 4 ? setCurrentStep(currentStep + 1) : navigate("/agents")}
            disabled={!canNext()}
          >
            {currentStep === 4 ? (
              <><Bot className="mr-1.5 h-4 w-4" /> Publish Agent</>
            ) : (
              <>Next <ChevronRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
