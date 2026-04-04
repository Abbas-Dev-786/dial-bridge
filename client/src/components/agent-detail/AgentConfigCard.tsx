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
}

export function AgentConfigCard({ isActive, name, model, temperature, maxTokens, prompt }: AgentConfigCardProps) {
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
            <Input defaultValue={name} disabled={isActive} />
          </div>
          <div className="space-y-2">
            <Label>LLM Model</Label>
            <Select defaultValue={model} disabled={isActive}>
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
            <Input type="number" step="0.1" min="0" max="2" defaultValue={temperature} disabled={isActive} />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input type="number" defaultValue={maxTokens} disabled={isActive} />
          </div>
        </div>
        <div className="space-y-2 mt-6">
          <Label>System Prompt</Label>
          <Textarea
            defaultValue={prompt}
            className="min-h-[150px] font-mono text-sm leading-relaxed"
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
