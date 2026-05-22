import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, BookOpen, Plus, ExternalLink, Trash2, Sparkles } from "lucide-react";
import { KB_SEED_SOURCES } from "@/lib/kbSources";

interface Doc {
  id: string;
  url: string;
  title: string;
  source_name: string | null;
  summary: string | null;
  language: string | null;
  updated_at: string;
}
interface Match {
  chunk_id: string;
  document_id: string;
  content: string;
  title: string;
  url: string;
  source_name: string | null;
  similarity: number;
}

const Knowledge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingesting, setIngesting] = useState<string | null>(null);

  useEffect(() => {
    if (user) supabase.rpc("is_admin").then(({ data }) => setIsAdmin(!!data));
    refresh();
  }, [user]);

  const refresh = async () => {
    const { data } = await supabase.from("kb_documents").select("*").order("updated_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearching(true); setMatches(null);
    try {
      const { data, error } = await supabase.functions.invoke("kb-search", { body: { query: q, limit: 8 } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMatches((data as any).matches ?? []);
    } catch (err: any) {
      toast({ title: "Search failed", description: err?.message, variant: "destructive" });
    } finally { setSearching(false); }
  };

  const ingest = async (url: string) => {
    setIngesting(url);
    try {
      const { data, error } = await supabase.functions.invoke("kb-ingest", { body: { url } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Imported", description: `${(data as any).title} — ${(data as any).chunks} chunks` });
      setIngestUrl("");
      await refresh();
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message, variant: "destructive" });
    } finally { setIngesting(null); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("kb_documents").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else refresh();
  };

  const ingestAllSeeds = async () => {
    for (const s of KB_SEED_SOURCES) {
      // eslint-disable-next-line no-await-in-loop
      await ingest(s.url);
    }
  };

  const highlight = (text: string) => {
    if (!q.trim()) return text;
    const terms = q.trim().split(/\s+/).filter(t => t.length > 2);
    if (!terms.length) return text;
    const re = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.split(re).map((part, i) =>
      re.test(part) ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark> : <span key={i}>{part}</span>,
    );
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-soft">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Afaan Oromo Knowledge Base</h1>
          <p className="text-muted-foreground">Pronunciation & linguistic guidance, with citations.</p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={search} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask: how is 'dh' pronounced in Afaan Oromo?"
            className="flex-1"
          />
          <Button type="submit" disabled={searching || !q.trim()}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Search</span>
          </Button>
        </form>
      </Card>

      {matches && (
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Results</h2>
          {matches.length === 0 && <p className="text-sm text-muted-foreground">No matches. Try ingesting more sources.</p>}
          {matches.map((m) => (
            <div key={m.chunk_id} className="border-l-2 border-primary/40 pl-4 space-y-2">
              <p className="text-sm leading-relaxed">{highlight(m.content)}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Badge variant="outline">{m.source_name ?? "source"}</Badge>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-md">
                  {m.title} <ExternalLink className="w-3 h-3" />
                </a>
                <span className="ml-auto">relevance {(m.similarity * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {isAdmin && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Admin · Import sources</h2>
            <Button size="sm" variant="outline" onClick={ingestAllSeeds} disabled={!!ingesting}>
              Import all curated sources
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} placeholder="https://example.com/oromo-grammar" />
            <Button onClick={() => ingest(ingestUrl)} disabled={!ingestUrl || !!ingesting}>
              {ingesting === ingestUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">Import</span>
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Curated seeds:</p>
            <div className="flex flex-wrap gap-2">
              {KB_SEED_SOURCES.map((s) => (
                <Button key={s.url} size="sm" variant="ghost" className="h-7 text-xs"
                  disabled={!!ingesting} onClick={() => ingest(s.url)}>
                  {ingesting === s.url ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {s.source_name}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Indexed sources ({docs.length})</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources imported yet.{isAdmin ? " Use the admin panel above to add some." : ""}</p>
        ) : (
          <div className="divide-y">
            {docs.map((d) => (
              <div key={d.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline inline-flex items-center gap-1 truncate">
                    {d.title} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <p className="text-xs text-muted-foreground truncate">{d.source_name} · {new URL(d.url).hostname}</p>
                  {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}
                </div>
                {isAdmin && (
                  <Button size="icon" variant="ghost" onClick={() => remove(d.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Knowledge;
