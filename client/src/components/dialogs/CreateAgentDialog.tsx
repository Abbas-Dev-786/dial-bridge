import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, Bot } from "lucide-react";
import { VoiceSettings, defaultVoiceConfig, VoiceConfig } from "@/components/VoiceSettings";

const dialogSteps = ["LLM & Prompt", "Voice", "Review"] as const;

const llmModels = [
  { id: "gpt-4o", name: "GPT-4o", description: "Best quality" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast & affordable" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", description: "Strong reasoning" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", description: "Ultra fast" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Large context" },
];

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (agent: { name: string; model: string; voice: string }) => void;
}

export function CreateAgentDialog({ open, onOpenChange, onCreated }: CreateAgentDialogProps) {
  const [step, setStep] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(defaultVoiceConfig);

  const reset = () => {
    setStep(0);
    setAgentName("");
    setModel("gpt-4o");
    setSystemPrompt("");
    setFirstMessage("");
    setVoiceConfig(defaultVoiceConfig);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const canNext = () => {
    if (step === 0) return agentName.trim().length > 0 && systemPrompt.trim().length > 0;
    return true;
  };

  const handleCreate = () => {
    onCreated?.({
      name: agentName,
      model: llmModels.find(m => m.id === model)?.name || model,
      voice: voiceConfig.voiceId.slice(0, 12),
    });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Create Agent
          </DialogTitle>
          <DialogDescription>Configure a new ElevenLabs conversational AI agent.</DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {dialogSteps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  i === step && "bg-primary text-primary-foreground",
                  i < step && "bg-primary/10 text-primary cursor-pointer",
                  i > step && "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < dialogSteps.length - 1 && (
                <div className={cn("h-px flex-1 mx-1", i < step ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 0: LLM & Prompt */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input placeholder="e.g. Sales Assistant" value={agentName} onChange={e => setAgentName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>LLM Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {llmModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground ml-1 text-xs">— {m.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>First Message</Label>
              <Input placeholder="Hello! How can I help you today?" value={firstMessage} onChange={e => setFirstMessage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                placeholder="You are a helpful assistant..."
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 1: Voice */}
        {step === 1 && <VoiceSettings config={voiceConfig} onChange={setVoiceConfig} />}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              {[
                { label: "Name", value: agentName || "—" },
                { label: "Model", value: llmModels.find(m => m.id === model)?.name || "—" },
                { label: "Voice ID", value: voiceConfig.voiceId.slice(0, 16) + "..." },
                { label: "First Message", value: firstMessage || "None" },
              ].map(item => (
                <div key={item.label} className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            {systemPrompt && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">System Prompt</p>
                <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-4">{systemPrompt}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button onClick={handleCreate}>
              <Bot className="mr-1.5 h-3.5 w-3.5" /> Create Agent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
