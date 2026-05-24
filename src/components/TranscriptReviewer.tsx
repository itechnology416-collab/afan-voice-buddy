import { useMemo, useState } from "react";
import type { TimedWord } from "@/lib/export";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, Play } from "lucide-react";

interface Props {
  words: TimedWord[];
  onChange: (words: TimedWord[]) => void;
  audioEl?: HTMLAudioElement | null;
}

const TranscriptReviewer = ({ words, onChange, audioEl }: Props) => {
  const [threshold, setThreshold] = useState(0.6);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const wordIndices = useMemo(
    () => words.map((w, i) => ({ w, i })).filter(({ w }) => (w.type ?? "word") === "word"),
    [words]
  );

  const flaggedCount = useMemo(
    () =>
      wordIndices.filter(
        ({ w }) => typeof w.confidence === "number" && w.confidence < threshold
      ).length,
    [wordIndices, threshold]
  );

  const updateWord = (idx: number, text: string) => {
    const next = words.slice();
    next[idx] = { ...next[idx], text, confidence: 1 };
    onChange(next);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraft(words[idx].text);
  };

  const commitEdit = () => {
    if (editingIdx == null) return;
    const v = draft.trim();
    if (v) updateWord(editingIdx, v);
    setEditingIdx(null);
  };

  const jump = (start: number) => {
    if (audioEl) {
      audioEl.currentTime = Math.max(0, start - 0.05);
      audioEl.play().catch(() => {});
    }
  };

  const markAllReviewed = () => {
    onChange(words.map((w) => ({ ...w, confidence: 1 })));
  };

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4 text-primary" />
          Review transcript
          <span className="text-xs text-muted-foreground font-normal">
            ({flaggedCount} flagged)
          </span>
        </div>
        <div className="flex items-center gap-3 min-w-[220px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Threshold {Math.round(threshold * 100)}%
          </span>
          <Slider
            value={[threshold]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setThreshold(v[0])}
            className="w-32"
          />
          <Button size="sm" variant="ghost" onClick={markAllReviewed}>
            Mark all OK
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 max-h-72 overflow-y-auto p-2 bg-background rounded-lg leading-relaxed">
        {wordIndices.map(({ w, i }) => {
          const conf = w.confidence;
          const isLow = typeof conf === "number" && conf < threshold;
          const isVeryLow = typeof conf === "number" && conf < Math.min(threshold, 0.35);
          if (editingIdx === i) {
            return (
              <Input
                key={i}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                  if (e.key === "Escape") setEditingIdx(null);
                }}
                className="h-7 px-2 py-0 text-sm w-auto inline-flex"
                style={{ width: `${Math.max(60, draft.length * 9)}px` }}
              />
            );
          }
          return (
            <button
              key={i}
              onClick={() => startEdit(i)}
              onDoubleClick={() => jump(w.start)}
              title={`${conf != null ? `${Math.round(conf * 100)}% • ` : ""}${w.start.toFixed(2)}s — click to edit, double-click to play`}
              className={cn(
                "px-1.5 py-0.5 rounded text-sm transition-colors",
                isVeryLow
                  ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                  : isLow
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30"
                  : "hover:bg-muted"
              )}
            >
              {w.text}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Click any word to edit · double-click to <Play className="w-3 h-3 inline" /> play from that point
        · corrections flow into your SRT export.
      </p>
    </div>
  );
};

export default TranscriptReviewer;
