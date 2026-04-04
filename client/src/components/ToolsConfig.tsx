import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Calendar, Search, PhoneForwarded, PhoneOff, Globe, Server,
  Wrench, Plus, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// System tools aligned to ElevenLabs
const systemTools = [
  { id: "end_call", name: "End Call", description: "Agent can hang up the call when conversation is complete", icon: PhoneOff },
  { id: "transfer_call", name: "Transfer Call", description: "Transfer to a human agent or another phone number", icon: PhoneForwarded },
];

// Preset client tools
const presetClientTools = [
  { id: "calendar_booking", name: "Calendar Booking", description: "Schedule appointments during calls", icon: Calendar },
  { id: "crm_lookup", name: "CRM Lookup", description: "Access customer data in real-time", icon: Search },
];

export interface ToolConfig {
  systemTools: string[];
  clientTools: string[];
  serverTools: ServerTool[];
}

export interface ServerTool {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  headers: string;
}

interface ToolsConfigProps {
  config: ToolConfig;
  onChange: (config: ToolConfig) => void;
  className?: string;
}

export function ToolsConfig({ config, onChange, className }: ToolsConfigProps) {
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  const toggleSystemTool = (id: string) => {
    const next = config.systemTools.includes(id)
      ? config.systemTools.filter((t) => t !== id)
      : [...config.systemTools, id];
    onChange({ ...config, systemTools: next });
  };

  const toggleClientTool = (id: string) => {
    const next = config.clientTools.includes(id)
      ? config.clientTools.filter((t) => t !== id)
      : [...config.clientTools, id];
    onChange({ ...config, clientTools: next });
  };

  const addServerTool = () => {
    const id = crypto.randomUUID();
    onChange({
      ...config,
      serverTools: [...config.serverTools, { id, name: "", description: "", url: "", method: "POST", headers: "" }],
    });
    setExpandedServer(id);
  };

  const updateServerTool = (id: string, partial: Partial<ServerTool>) => {
    onChange({
      ...config,
      serverTools: config.serverTools.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    });
  };

  const removeServerTool = (id: string) => {
    onChange({ ...config, serverTools: config.serverTools.filter((t) => t.id !== id) });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* System Tools */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">System Tools</Label>
          <p className="text-xs text-muted-foreground">Built-in actions the agent can perform</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {systemTools.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 transition-all",
                config.systemTools.includes(tool.id) && "border-primary bg-primary/5"
              )}
            >
              <div className="rounded-lg bg-muted p-2">
                <tool.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <Switch checked={config.systemTools.includes(tool.id)} onCheckedChange={() => toggleSystemTool(tool.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Client Tools */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Client Tools</Label>
          <p className="text-xs text-muted-foreground">Actions executed on the client side (browser/app)</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {presetClientTools.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 transition-all",
                config.clientTools.includes(tool.id) && "border-primary bg-primary/5"
              )}
            >
              <div className="rounded-lg bg-muted p-2">
                <tool.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <Switch checked={config.clientTools.includes(tool.id)} onCheckedChange={() => toggleClientTool(tool.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Server Tools (Webhooks) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Server Tools (Webhooks)</Label>
            <p className="text-xs text-muted-foreground">External API endpoints the agent calls during conversations</p>
          </div>
          <Button variant="outline" size="sm" onClick={addServerTool}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {config.serverTools.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Server className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No server tools configured</p>
            <p className="text-xs text-muted-foreground">Add a webhook URL that your agent can call during conversations</p>
          </div>
        )}

        {config.serverTools.map((tool) => (
          <div key={tool.id} className="rounded-xl border bg-card shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setExpandedServer(expandedServer === tool.id ? null : tool.id)}
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{tool.name || "Untitled Tool"}</span>
                {tool.method && <Badge variant="secondary" className="text-xs">{tool.method}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeServerTool(tool.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {expandedServer === tool.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {expandedServer === tool.id && (
              <div className="border-t p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Tool Name</Label>
                    <Input placeholder="check_inventory" value={tool.name} onChange={(e) => updateServerTool(tool.id, { name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">HTTP Method</Label>
                    <Select value={tool.method} onValueChange={(v) => updateServerTool(tool.id, { method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Input placeholder="Checks product availability in the warehouse" value={tool.description} onChange={(e) => updateServerTool(tool.id, { description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Webhook URL</Label>
                  <Input placeholder="https://api.example.com/check-inventory" value={tool.url} onChange={(e) => updateServerTool(tool.id, { url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Headers (JSON)</Label>
                  <Textarea
                    placeholder={'{\n  "Authorization": "Bearer ...",\n  "Content-Type": "application/json"\n}'}
                    value={tool.headers}
                    onChange={(e) => updateServerTool(tool.id, { headers: e.target.value })}
                    className="font-mono text-xs min-h-[80px]"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const defaultToolConfig: ToolConfig = {
  systemTools: ["end_call"],
  clientTools: [],
  serverTools: [],
};
