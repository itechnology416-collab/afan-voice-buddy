import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHistory, removeHistory, clearHistory, HistoryItem } from "@/lib/history";
import { Mic, Volume2, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formatDate = (ts: number) => new Date(ts).toLocaleString();

const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const { toast } = useToast();

  const refresh = () => setItems(getHistory());
  useEffect(() => { refresh(); }, []);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground">Your previous conversions, saved on this device.</p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={() => { clearHistory(); refresh(); }}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear all
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No history yet. Try Speech to Text or Text to Speech.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {item.kind === "stt"
                  ? <Mic className="w-5 h-5 text-primary" />
                  : <Volume2 className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium uppercase">{item.kind === "stt" ? "Speech → Text" : "Text → Speech"}</span>
                  <span>·</span>
                  <span>{formatDate(item.createdAt)}</span>
                  {item.dialect && item.dialect !== "general" && (
                    <><span>·</span><span className="capitalize">{item.dialect}</span></>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-4">
                  {item.text}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleCopy(item.text)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { removeHistory(item.id); refresh(); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
