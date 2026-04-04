import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ConversationFlowConfig {
  firstMessage: string;
  language: string;
  maxDuration: string;
  endCallAfterSilence: string;
  interruptionSensitivity: string;
  turnEndpointDelay: string;
  enableBackchannel: boolean;
  enableDataCollection: boolean;
  dataCollectionFields: string;
}

interface ConversationFlowSettingsProps {
  config: ConversationFlowConfig;
  onChange: (config: ConversationFlowConfig) => void;
  className?: string;
}

const languages = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "pt", label: "Portuguese" },
  { id: "nl", label: "Dutch" },
  { id: "pl", label: "Polish" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "zh", label: "Chinese" },
  { id: "hi", label: "Hindi" },
  { id: "ar", label: "Arabic" },
];

export function ConversationFlowSettings({ config, onChange, className }: ConversationFlowSettingsProps) {
  const update = (partial: Partial<ConversationFlowConfig>) => onChange({ ...config, ...partial });

  return (
    <div className={cn("space-y-6", className)}>
      {/* First Message */}
      <div className="space-y-2">
        <Label>First Message (Greeting)</Label>
        <Textarea
          placeholder="Hello! Thank you for calling. How can I help you today?"
          value={config.firstMessage}
          onChange={(e) => update({ firstMessage: e.target.value })}
          className="min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">The first thing the agent says when a conversation starts.</p>
      </div>

      {/* Language */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select value={config.language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {languages.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Max Call Duration (seconds)</Label>
          <Input
            type="number"
            value={config.maxDuration}
            onChange={(e) => update({ maxDuration: e.target.value })}
            placeholder="300"
          />
        </div>
      </div>

      {/* Turn-taking */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>End Call After Silence (seconds)</Label>
          <Input
            type="number"
            value={config.endCallAfterSilence}
            onChange={(e) => update({ endCallAfterSilence: e.target.value })}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">Auto-end call after this many seconds of silence.</p>
        </div>

        <div className="space-y-2">
          <Label>Interruption Sensitivity</Label>
          <Select value={config.interruptionSensitivity} onValueChange={(v) => update({ interruptionSensitivity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low — Hard to interrupt</SelectItem>
              <SelectItem value="medium">Medium — Balanced</SelectItem>
              <SelectItem value="high">High — Easy to interrupt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Turn Endpoint Delay (ms)</Label>
          <Input
            type="number"
            value={config.turnEndpointDelay}
            onChange={(e) => update({ turnEndpointDelay: e.target.value })}
            placeholder="500"
          />
          <p className="text-xs text-muted-foreground">How long to wait before the agent responds after user stops speaking.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Backchannel</Label>
              <p className="text-xs text-muted-foreground">Agent says "uh-huh", "I see" while listening</p>
            </div>
            <Switch checked={config.enableBackchannel} onCheckedChange={(v) => update({ enableBackchannel: v })} />
          </div>
        </div>
      </div>

      {/* Data Collection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm">Structured Data Collection</Label>
            <p className="text-xs text-muted-foreground">Extract specific fields from the conversation</p>
          </div>
          <Switch checked={config.enableDataCollection} onCheckedChange={(v) => update({ enableDataCollection: v })} />
        </div>

        {config.enableDataCollection && (
          <div className="space-y-2">
            <Label>Fields to Collect (one per line)</Label>
            <Textarea
              placeholder={"name: string — Customer's full name\nemail: string — Customer's email\ninterest_level: high|medium|low — How interested they are"}
              value={config.dataCollectionFields}
              onChange={(e) => update({ dataCollectionFields: e.target.value })}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const defaultConversationFlowConfig: ConversationFlowConfig = {
  firstMessage: "",
  language: "en",
  maxDuration: "300",
  endCallAfterSilence: "30",
  interruptionSensitivity: "medium",
  turnEndpointDelay: "500",
  enableBackchannel: true,
  enableDataCollection: false,
  dataCollectionFields: "",
};
