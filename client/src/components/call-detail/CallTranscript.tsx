import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface CallAudioPlayerProps {
  duration: string;
}

export function CallAudioPlayer({ duration }: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <div className="h-8 rounded bg-muted flex items-end gap-px px-1 overflow-hidden">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/30" style={{ height: `${Math.random() * 100}%` }} />
            ))}
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground">0:00 / {duration}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed:</span>
        {[1, 1.5, 2].map((s) => (
          <Button key={s} variant={playbackSpeed === s ? "default" : "ghost"} size="sm" className="h-6 px-2 text-xs" onClick={() => setPlaybackSpeed(s)}>
            {s}x
          </Button>
        ))}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

export function CallTranscript({ transcript }: { transcript: any[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <h3 className="font-semibold text-sm">Turn-by-Turn Transcript</h3>
      <div className="space-y-4">
        {transcript.map((line, i) => (
          <div key={i} className={cn(
            "flex",
            line.speaker === "agent" ? "justify-start" : line.speaker === "tool" ? "justify-center" : "justify-end"
          )}>
            {line.speaker === "tool" ? (
              <div className="rounded-lg bg-muted px-3 py-2 font-mono text-[10px] text-muted-foreground border border-border/50">
                {line.text}
                <span className="ml-2 text-primary font-bold">{line.latency}</span>
              </div>
            ) : (
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                line.speaker === "agent" ? "bg-primary/10 border border-primary/20" : "bg-muted border border-border"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                    {line.speaker === "agent" ? "Agent" : "User"}
                  </span>
                  {line.latency !== "—" && (
                    <span className="text-[10px] font-mono text-primary font-bold bg-primary/10 px-1 rounded">{line.latency}</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{line.text}</p>
                <div className="flex justify-end mt-1">
                  <button className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono">{line.time}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
