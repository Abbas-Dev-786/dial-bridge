import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import { formatSecondsToDuration, cn } from "@/lib/utils";

interface CallAudioPlayerProps {
  src?: string;
  duration?: string | number;
}

export function CallAudioPlayer({ src, duration: initialDuration }: CallAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (typeof initialDuration === "number") {
      setDuration(initialDuration);
    } else if (typeof initialDuration === "string") {
      // Parse "m:ss" to seconds
      const parts = initialDuration.split(":");
      if (parts.length === 2) {
        setDuration(parseInt(parts[0]) * 60 + parseInt(parts[1]));
      }
    }
  }, [initialDuration]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  // Generate deterministic but random-looking waveform bars
  const bars = Array.from({ length: 60 }).map((_, i) => {
    const seed = (i * 12345) % 100;
    return seed;
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <Button size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-sm" onClick={togglePlay} disabled={!src}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <div 
            className="h-8 rounded bg-muted flex items-end gap-px px-1 overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
          >
            {bars.map((seed, i) => {
              const progress = (currentTime / (duration || 1)) * 100;
              const isFilled = (i / bars.length) * 100 <= progress;
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 rounded-t transition-colors",
                    isFilled ? "bg-primary" : "bg-primary/20"
                  )} 
                  style={{ height: `${20 + (seed % 80)}%` }} 
                />
              );
            })}
          </div>
        </div>
        <div className="flex flex-col items-end min-w-[70px]">
          <span className="text-xs font-mono font-medium">{formatSecondsToDuration(currentTime)}</span>
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
            / {formatSecondsToDuration(duration)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Speed</span>
          <div className="flex bg-muted rounded-lg p-0.5">
            {[1, 1.5, 2].map((s) => (
              <Button 
                key={s} 
                variant={playbackSpeed === s ? "secondary" : "ghost"} 
                size="sm" 
                className={cn(
                  "h-6 px-3 text-[10px] font-bold rounded-md",
                  playbackSpeed === s ? "bg-background shadow-sm" : ""
                )} 
                onClick={() => handleSpeedChange(s)}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-50">
          <Volume2 className="h-3 w-3" />
          <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
            <div className="w-3/4 h-full bg-foreground/20" />
          </div>
        </div>
      </div>
    </div>
  );
}


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
