import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  isActive: boolean;
  className?: string;
}

export const AudioWaveform = ({ isActive, className }: AudioWaveformProps) => {
  const bars = 5;

  return (
    <div className={cn("flex items-center justify-center gap-1 h-8", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-primary rounded-full transition-all duration-300",
            isActive ? "animate-wave" : "h-2"
          )}
          style={{
            animationDelay: isActive ? `${i * 0.15}s` : "0s",
            height: isActive ? undefined : "8px",
          }}
        />
      ))}
    </div>
  );
};
