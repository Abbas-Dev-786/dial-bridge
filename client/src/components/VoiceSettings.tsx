import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export interface VoiceConfig {
  voiceId: string;
  stability: number[];
  similarityBoost: number[];
  style: number[];
  speed: number[];
}

interface VoiceSettingsProps {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
  className?: string;
}

export const elevenLabsVoices = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", lang: "English (US)", gender: "Female" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", lang: "English (US)", gender: "Male" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", lang: "English (US)", gender: "Female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", lang: "English (UK)", gender: "Male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", lang: "English (US)", gender: "Male" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", lang: "English (UK)", gender: "Female" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", lang: "English (US)", gender: "Female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", lang: "English (UK)", gender: "Female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", lang: "English (UK)", gender: "Male" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", lang: "English (US)", gender: "Male" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", lang: "English (US)", gender: "Male" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", lang: "English (US)", gender: "Male" },
];

export function VoiceSettings({ config, onChange, className }: VoiceSettingsProps) {
  const update = (partial: Partial<VoiceConfig>) => onChange({ ...config, ...partial });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Voice Picker */}
      <div className="space-y-2">
        <Label>Voice</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {elevenLabsVoices.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => update({ voiceId: v.id })}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                config.voiceId === v.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-primary/40"
              )}
            >
              <div className="rounded-full bg-muted p-2">
                <Play className="h-3 w-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.lang} · {v.gender}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Browse 5,000+ voices in the <a href="https://elevenlabs.io/voice-library" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ElevenLabs Voice Library</a>
        </p>
      </div>

      {/* Voice Settings Sliders */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Stability</Label>
            <span className="text-xs font-mono text-muted-foreground">{config.stability[0]}%</span>
          </div>
          <Slider value={config.stability} onValueChange={(v) => update({ stability: v })} max={100} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More variable</span><span>More stable</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Similarity Boost</Label>
            <span className="text-xs font-mono text-muted-foreground">{config.similarityBoost[0]}%</span>
          </div>
          <Slider value={config.similarityBoost} onValueChange={(v) => update({ similarityBoost: v })} max={100} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low</span><span>High</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Style Exaggeration</Label>
            <span className="text-xs font-mono text-muted-foreground">{config.style[0]}%</span>
          </div>
          <Slider value={config.style} onValueChange={(v) => update({ style: v })} max={100} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span><span>Exaggerated</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Speed</Label>
            <span className="text-xs font-mono text-muted-foreground">{(config.speed[0] / 100).toFixed(1)}x</span>
          </div>
          <Slider value={config.speed} onValueChange={(v) => update({ speed: v })} min={70} max={120} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.7x</span><span>1.2x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const defaultVoiceConfig: VoiceConfig = {
  voiceId: "EXAVITQu4vr4xnSDxMaL",
  stability: [50],
  similarityBoost: [75],
  style: [0],
  speed: [100],
};
