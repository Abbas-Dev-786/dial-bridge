import { useState, useRef, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Play, Pause, Square, Search, Loader2, Check } from "lucide-react";

export interface VoiceConfig {
  voiceId: string;
  stability: number[];
  similarityBoost: number[];
  style: number[];
  speed: number[];
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string | null;
  labels?: Record<string, string>;
}

// Kept as fallback when voices API fails / loads
export const fallbackVoices: ElevenLabsVoice[] = [
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", labels: { accent: "American", gender: "female" } },
  { voice_id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", labels: { accent: "American", gender: "male" } },
  { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", labels: { accent: "American", gender: "female" } },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", labels: { accent: "British", gender: "male" } },
  { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", labels: { accent: "American", gender: "male" } },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", labels: { accent: "British", gender: "female" } },
  { voice_id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", labels: { accent: "American", gender: "female" } },
  { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", labels: { accent: "British", gender: "female" } },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", labels: { accent: "British", gender: "male" } },
  { voice_id: "iP95p4xoKVk53GoZ742B", name: "Chris", labels: { accent: "American", gender: "male" } },
  { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", labels: { accent: "American", gender: "male" } },
  { voice_id: "cjVigY5qzO86Huf0OWal", name: "Eric", labels: { accent: "American", gender: "male" } },
];

interface VoiceSettingsProps {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
  voices?: ElevenLabsVoice[];
  isLoadingVoices?: boolean;
  className?: string;
}

type GenderFilter = "all" | "male" | "female";

export function VoiceSettings({
  config,
  onChange,
  voices,
  isLoadingVoices,
  className,
}: VoiceSettingsProps) {
  const update = (partial: Partial<VoiceConfig>) =>
    onChange({ ...config, ...partial });

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Resolve voice list: API voices → fallback
  const allVoices =
    voices && voices.length > 0 ? voices : fallbackVoices;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Filter logic
  const filteredVoices = allVoices.filter((v) => {
    const gender = (v.labels?.gender || "").toLowerCase();
    if (genderFilter !== "all" && gender !== genderFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const name = v.name.toLowerCase();
      const accent = (v.labels?.accent || "").toLowerCase();
      const category = (v.category || "").toLowerCase();
      const desc = (v.description || "").toLowerCase();
      if (
        !name.includes(q) &&
        !accent.includes(q) &&
        !category.includes(q) &&
        !desc.includes(q)
      )
        return false;
    }

    return true;
  });

  const handlePlay = useCallback(
    (voice: ElevenLabsVoice) => {
      // If already playing this voice, stop it
      if (playingId === voice.voice_id) {
        audioRef.current?.pause();
        setPlayingId(null);
        setLoadingAudioId(null);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (!voice.preview_url) return;

      setLoadingAudioId(voice.voice_id);
      const audio = new Audio(voice.preview_url);
      audioRef.current = audio;

      audio.addEventListener("canplaythrough", () => {
        setLoadingAudioId(null);
        setPlayingId(voice.voice_id);
        audio.play().catch(() => {
          setPlayingId(null);
        });
      });

      audio.addEventListener("ended", () => {
        setPlayingId(null);
      });

      audio.addEventListener("error", () => {
        setLoadingAudioId(null);
        setPlayingId(null);
      });

      audio.load();
    },
    [playingId],
  );

  const getGenderEmoji = (gender: string) => {
    const g = gender.toLowerCase();
    if (g === "male") return "♂";
    if (g === "female") return "♀";
    return "";
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Voice Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Voice</Label>
          <span className="text-xs text-muted-foreground">
            {filteredVoices.length} voice{filteredVoices.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              id="voice-search-input"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/30">
            {(["all", "male", "female"] as GenderFilter[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  genderFilter === g
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {g === "all" ? "All" : g === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Grid */}
        {isLoadingVoices ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[340px] pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-1">
              {filteredVoices.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No voices match your search
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setGenderFilter("all");
                    }}
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredVoices.map((v) => {
                  const isSelected = config.voiceId === v.voice_id;
                  const isPlaying = playingId === v.voice_id;
                  const isLoading = loadingAudioId === v.voice_id;
                  const gender = v.labels?.gender || "";
                  const accent = v.labels?.accent || "";
                  const age = v.labels?.age || "";

                  return (
                    <div
                      key={v.voice_id}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl border p-3 transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                          : "hover:border-primary/40 hover:bg-muted/30",
                      )}
                      onClick={() => update({ voiceId: v.voice_id })}
                    >
                      {/* Play / Pause Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(v);
                        }}
                        disabled={!v.preview_url}
                        className={cn(
                          "shrink-0 rounded-full flex items-center justify-center transition-all h-9 w-9",
                          isPlaying
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : isLoading
                              ? "bg-primary/10 text-primary"
                              : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary",
                          !v.preview_url && "opacity-30 cursor-not-allowed",
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isPlaying ? (
                          <Square className="h-3 w-3 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 ml-0.5" />
                        )}
                      </button>

                      {/* Voice Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">
                            {v.name}
                          </p>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[accent, gender ? getGenderEmoji(gender) + " " + gender : "", age]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {v.category && (
                          <Badge
                            variant="outline"
                            className="mt-0.5 h-4 px-1.5 text-[10px] font-normal"
                          >
                            {v.category}
                          </Badge>
                        )}
                      </div>

                      {/* Playing indicator pulse */}
                      {isPlaying && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-primary rounded-full animate-pulse"
                              style={{
                                height: `${6 + Math.random() * 6}px`,
                                animationDelay: `${i * 150}ms`,
                                animationDuration: "600ms",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}

        <p className="text-xs text-muted-foreground">
          Browse 5,000+ voices in the{" "}
          <a
            href="https://elevenlabs.io/voice-library"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ElevenLabs Voice Library
          </a>
        </p>
      </div>

      {/* Voice Settings Sliders */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Stability</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {config.stability[0]}%
            </span>
          </div>
          <Slider
            value={config.stability}
            onValueChange={(v) => update({ stability: v })}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>More variable</span>
            <span>More stable</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Similarity Boost</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {config.similarityBoost[0]}%
            </span>
          </div>
          <Slider
            value={config.similarityBoost}
            onValueChange={(v) => update({ similarityBoost: v })}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Style Exaggeration</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {config.style[0]}%
            </span>
          </div>
          <Slider
            value={config.style}
            onValueChange={(v) => update({ style: v })}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtle</span>
            <span>Exaggerated</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Speed</Label>
            <span className="text-xs font-mono text-muted-foreground">
              {(config.speed[0] / 100).toFixed(1)}x
            </span>
          </div>
          <Slider
            value={config.speed}
            onValueChange={(v) => update({ speed: v })}
            min={70}
            max={120}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.7x</span>
            <span>1.2x</span>
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
