import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LLM_MODELS } from "@/lib/agent-constants";
import { cn } from "@/lib/utils";

interface AgentConfigCardProps {
  isActive: boolean;
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  prompt: string;
  onChange: (field: string, value: any) => void;
}

export function AgentConfigCard({ 
  isActive, 
  name, 
  model, 
  temperature, 
  maxTokens, 
  prompt,
  onChange
}: AgentConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuration</CardTitle>
        <CardDescription>Core agent settings and system prompt.</CardDescription>
      </CardHeader>
      <CardContent className={cn(isActive && "pointer-events-none opacity-60")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Agent Name</Label>
            <Input 
              value={name} 
              disabled={isActive} 
              onChange={(e) => onChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>LLM Model</Label>
            <Select 
              value={model} 
              disabled={isActive} 
              onValueChange={(v) => onChange("llm_model", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LLM_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 mt-6">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input 
              type="number" 
              step="0.1" 
              min="0" 
              max="2" 
              value={temperature} 
              disabled={isActive} 
              onChange={(e) => onChange("temperature", parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input 
              type="number" 
              value={maxTokens} 
              disabled={isActive} 
              onChange={(e) => onChange("max_tokens", parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-2 mt-6">
          <Label>System Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => onChange("system_prompt", e.target.value)}
            className="min-h-[200px] font-mono text-sm leading-relaxed"
            readOnly={isActive}
          />
        </div>
      </CardContent>
    </Card>
  );
}

import { AlertTriangle } from "lucide-react";

export function AgentActiveBanner({ campaign }: { campaign: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-warning">
          This agent is currently active in {campaign}.
        </p>
        <p className="text-xs text-warning/80 mt-0.5">
          Some settings cannot be edited while the campaign is running.
        </p>
      </div>
    </div>
  );
}
