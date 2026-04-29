import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  /** Synchronous — matches ElevenLabs SDK getInputByteFrequencyData / getOutputByteFrequencyData */
  getFrequencyData: () => Uint8Array | undefined;
  isActive: boolean;
  isSpeaking?: boolean;
  variant?: "bars" | "wave";
  barCount?: number;
  className?: string;
}

export function AudioVisualizer({
  getFrequencyData,
  isActive,
  isSpeaking = false,
  variant = "bars",
  barCount = 32,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const data = dataRef.current;

    if (!data || !isActive) {
      // Draw idle state — subtle flat bars
      const idleBarWidth = width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const x = i * (width / barCount) + 1;
        const barHeight = 2;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = "hsl(var(--muted-foreground) / 0.15)";
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(idleBarWidth, 1), barHeight, 1);
        ctx.fill();
      }
      return;
    }

    // Sample frequency data to match barCount
    const step = Math.floor(data.length / barCount);

    if (variant === "bars") {
      const barWidth = width / barCount - 2;
      const maxBarHeight = height * 0.85;

      for (let i = 0; i < barCount; i++) {
        const idx = Math.min(i * step, data.length - 1);
        const value = data[idx] / 255;
        const barHeight = Math.max(value * maxBarHeight, 2);
        const x = i * (width / barCount) + 1;
        const y = (height - barHeight) / 2;

        // Gradient from primary to primary/30 based on intensity
        const alpha = 0.3 + value * 0.7;
        ctx.fillStyle = isSpeaking
          ? `hsl(15 85% 50% / ${alpha})`
          : `hsl(152 65% 33% / ${alpha})`;

        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(barWidth, 1), barHeight, barWidth / 2);
        ctx.fill();
      }
    } else {
      // Wave variant
      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      for (let i = 0; i < barCount; i++) {
        const idx = Math.min(i * step, data.length - 1);
        const value = data[idx] / 255;
        const x = (i / (barCount - 1)) * width;
        const y = height / 2 + (value - 0.5) * height * 0.8;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = ((i - 1) / (barCount - 1)) * width;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(cpX, y, x, y);
        }
      }

      ctx.strokeStyle = isSpeaking
        ? "hsl(15 85% 50% / 0.6)"
        : "hsl(152 65% 33% / 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill underneath
      ctx.lineTo(width, height / 2);
      ctx.lineTo(0, height / 2);
      ctx.closePath();
      ctx.fillStyle = isSpeaking
        ? "hsl(15 85% 50% / 0.08)"
        : "hsl(152 65% 33% / 0.08)";
      ctx.fill();
    }
  }, [isActive, isSpeaking, variant, barCount]);

  // Animation loop — synchronous getFrequencyData per SDK docs
  useEffect(() => {
    if (!isActive) {
      dataRef.current = null;
      draw();
      return;
    }

    let running = true;

    const animate = () => {
      if (!running) return;

      try {
        const data = getFrequencyData();
        if (data) {
          dataRef.current = data;
        }
      } catch {
        // Ignore errors, keep animating
      }

      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, getFrequencyData, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "w-full rounded-xl",
        className
      )}
      style={{ height: "100%" }}
    />
  );
}
