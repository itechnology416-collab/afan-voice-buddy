import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { Loader2, Volume2 } from "lucide-react";

const ResetPassword = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash; getSession reads them.
    const hash = window.location.hash;
    const isRecovery = /type=recovery/.test(hash);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session || isRecovery) setReady(true);
      else {
        toast({ title: t("reset.invalid"), variant: "destructive" });
      }
    });
  }, [t, toast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { toast({ title: t("reset.mismatch"), variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast({ title: t("reset.success") });
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/40 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-soft">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center">
            <Volume2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{t("reset.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("reset.sub")}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pw">{t("reset.newPassword")}</Label>
            <Input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">{t("reset.confirm")}</Label>
            <Input id="pw2" type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !ready}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("reset.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
