import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Copy, ArrowLeft } from "lucide-react";
import { getSharedTranscription } from "@/lib/history";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";

const Share = () => {
  const { token = "" } = useParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getSharedTranscription(token);
        setItem(d);
      } catch { setItem(null); }
      setLoading(false);
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/40">
      <header className="h-14 flex items-center px-4 border-b border-border bg-card/60 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Volume2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold">Afaan Oromo Natural Voice</span>
        </Link>
      </header>
      <div className="container max-w-3xl mx-auto p-4 md:p-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Link>
        </Button>
        <Card className="p-6 md:p-8 shadow-soft">
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !item ? (
            <p className="text-muted-foreground">{t("share.notFound")}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-bold">{t("share.title")}</h1>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()} {item.dialect ? `· ${item.dialect}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { navigator.clipboard.writeText(item.text); toast({ title: t("common.copied") }); }}
                >
                  <Copy className="w-4 h-4 mr-1" /> {t("common.copy")}
                </Button>
              </div>
              <div className="whitespace-pre-wrap text-foreground bg-muted/40 rounded-xl p-4 leading-relaxed">
                {item.text}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Share;
