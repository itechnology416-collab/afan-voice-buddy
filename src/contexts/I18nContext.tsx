import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { en, type Dict } from "@/locales/en";
import { om } from "@/locales/om";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "om";
const DICTS: Record<Lang, Dict> = { en, om };
const KEY = "aon_lang";

type Path = string;
function get(obj: any, path: Path): any {
  return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
}

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Path, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nState>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const v = localStorage.getItem(KEY);
    return v === "om" || v === "en" ? v : "en";
  });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return;
      const { data } = await supabase.from("profiles").select("language").eq("user_id", user.id).maybeSingle();
      const remote = (data?.language as Lang | undefined);
      if (remote && (remote === "en" || remote === "om") && remote !== lang) {
        setLangState(remote);
        localStorage.setItem(KEY, remote);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(KEY, l);
    document.documentElement.lang = l;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("profiles").update({ language: l }).eq("user_id", user.id);
    });
  };

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = useMemo(() => {
    const dict = DICTS[lang];
    return (key: Path, vars?: Record<string, string | number>) => {
      let v = get(dict, key);
      if (v == null) v = get(en, key);
      if (typeof v !== "string") return key;
      if (vars) for (const [k, val] of Object.entries(vars)) v = v.replace(new RegExp(`\\{${k}\\}`, "g"), String(val));
      return v;
    };
  }, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
