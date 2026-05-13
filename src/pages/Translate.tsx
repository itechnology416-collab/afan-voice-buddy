import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Copy, Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LANGS = [
  { value: "om", label: "Afaan Oromo" },
  { value: "en", label: "English" },
  { value: "am", label: "Amharic" },
];

const TranslatePage = () => {
  const { toast } = useToast();
  const [source, setSource] = useState("om");
  const [target, setTarget] = useState("en");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const seed = sessionStorage.getItem("translate_input");
    if (seed) {
      setInput(seed);
      sessionStorage.removeItem("translate_input");
    }
  }, []);

  const swap = () => {
    setSource(target);
    setTarget(source);
    setInput(output);
    setOutput(input);
  };

  const translate = async () => {
    if (!input.trim()) return;
    setBusy(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text: input, source, target },
      });
      if (error) throw error;
      const r = (data as { text?: string; error?: string }) ?? {};
      if (r.error) throw new Error(r.error);
      setOutput(r.text ?? "");
    } catch (err: any) {
      toast({ title: "Translation failed", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
          <Languages className="w-7 h-7 text-primary" /> Translate
        </h1>
        <p className="text-muted-foreground">Afaan Oromo ↔ English ↔ Amharic, powered by AI.</p>
      </div>

      <Card className="p-6 md:p-8 space-y-4 shadow-soft">
        <div className="flex items-center gap-3 justify-center">
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-44 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={swap} title="Swap languages">
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-44 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text here..."
            className="min-h-[200px] bg-background"
          />
          <div className="relative">
            <Textarea
              value={output}
              readOnly
              placeholder="Translation will appear here..."
              className="min-h-[200px] bg-muted/40"
            />
            {output && (
              <Button
                variant="ghost" size="icon"
                className="absolute top-2 right-2"
                onClick={() => { navigator.clipboard.writeText(output); toast({ title: "Copied" }); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={translate} disabled={busy || !input.trim()}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Translate
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TranslatePage;
