import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { Loader2, Shield, ShieldOff } from "lucide-react";

interface Row {
  user_id: string;
  display_name: string | null;
  role: "admin" | "moderator" | "user";
  transcripts: number;
}

const Admin = () => {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAllowed(false); return; }
    (async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error || !data) { setAllowed(false); return; }
      setAllowed(true);
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const refresh = async () => {
    const [{ data: profiles }, { data: roles }, { data: counts }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("transcriptions").select("user_id"),
    ]);
    const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role as Row["role"]]));
    const countMap = new Map<string, number>();
    (counts ?? []).forEach((c: any) => countMap.set(c.user_id, (countMap.get(c.user_id) ?? 0) + 1));
    setRows(
      (profiles ?? []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        role: roleMap.get(p.user_id) ?? "user",
        transcripts: countMap.get(p.user_id) ?? 0,
      })),
    );
  };

  const setRole = async (uid: string, role: Row["role"]) => {
    setBusy(uid);
    try {
      const { error } = await supabase.rpc("set_user_role", { target_user_id: uid, new_role: role });
      if (error) throw error;
      toast({ title: t("admin.updated") });
      await refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (authLoading || allowed === null) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }
  if (!allowed) {
    return (
      <div className="container max-w-2xl mx-auto p-8">
        <Card className="p-8 text-center text-muted-foreground">{t("admin.forbidden")}</Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("admin.title")}</h1>
        <p className="text-muted-foreground">{t("admin.sub")}</p>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b">
          <div className="col-span-5">{t("admin.users")}</div>
          <div className="col-span-2">{t("admin.role")}</div>
          <div className="col-span-2 text-right">{t("admin.transcripts")}</div>
          <div className="col-span-3" />
        </div>
        {rows.map((r) => (
          <div key={r.user_id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b last:border-0">
            <div className="col-span-5 truncate">
              <p className="text-sm font-medium truncate">{r.display_name ?? r.user_id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground truncate">{r.user_id}</p>
            </div>
            <div className="col-span-2">
              <Badge variant={r.role === "admin" ? "default" : "outline"}>{r.role}</Badge>
            </div>
            <div className="col-span-2 text-right text-sm">{r.transcripts}</div>
            <div className="col-span-3 flex justify-end">
              {r.role === "admin" ? (
                <Button size="sm" variant="outline" disabled={busy === r.user_id || r.user_id === user!.id}
                  onClick={() => setRole(r.user_id, "user")}>
                  <ShieldOff className="w-4 h-4 mr-1" /> {t("admin.demote")}
                </Button>
              ) : (
                <Button size="sm" disabled={busy === r.user_id}
                  onClick={() => setRole(r.user_id, "admin")}>
                  <Shield className="w-4 h-4 mr-1" /> {t("admin.promote")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default Admin;
