import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getHistory, removeHistory, clearHistory, HistoryItem, shareCloudTranscription } from "@/lib/history";
import { exportTxt, exportDocx, exportPdf, exportSrt } from "@/lib/export";
import { Mic, Volume2, Trash2, Copy, FileText, FileType, FileDown, Subtitles, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const formatDate = (ts: number) => new Date(ts).toLocaleString();

const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    setItems(await getHistory());
  }, []);

  useEffect(() => { refresh(); }, [refresh, user]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground">
            {user ? "Your transcriptions, synced across devices." : "Saved on this device. Sign in to sync."}
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={async () => { await clearHistory(); refresh(); }}>
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
                  <span className="font-medium uppercase">{item.kind === "stt" ? "Speech → Text" : "Text → Speech"}</span>
                  <span>·</span>
                  <span>{formatDate(item.createdAt)}</span>
                  {item.dialect && item.dialect !== "general" && (
                    <><span>·</span><span className="capitalize">{item.dialect}</span></>
                  )}
                  <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5">{item.source}</Badge>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-4">
                  {item.text}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleCopy(item.text)}>
                  <Copy className="w-4 h-4" />
                </Button>
                {item.source === "cloud" && (
                  <Button variant="ghost" size="icon" title="Share" onClick={async () => {
                    try {
                      const token = item.shareToken ?? await shareCloudTranscription(item.id);
                      const url = `${window.location.origin}/share/${token}`;
                      await navigator.clipboard.writeText(url);
                      toast({ title: "Share link copied", description: url });
                      refresh();
                    } catch (e: any) {
                      toast({ title: "Could not share", description: e?.message, variant: "destructive" });
                    }
                  }}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><FileDown className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportTxt(item.text)}>
                      <FileText className="w-4 h-4 mr-2" /> .txt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportDocx(item.text)}>
                      <FileType className="w-4 h-4 mr-2" /> .docx
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportPdf(item.text)}>
                      <FileType className="w-4 h-4 mr-2" /> .pdf
                    </DropdownMenuItem>
                    {item.kind === "stt" && (
                      <DropdownMenuItem onClick={() => exportSrt(item.text, item.durationSeconds)}>
                        <Subtitles className="w-4 h-4 mr-2" /> .srt
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost" size="icon"
                  onClick={async () => { await removeHistory(item.id, item.source); refresh(); }}
                >
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
