import { supabase } from "@/integrations/supabase/client";

export type HistoryKind = "stt" | "tts";

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  text: string;
  createdAt: number;
  dialect?: string;
  audioUrl?: string;
  durationSeconds?: number;
  source: "local" | "cloud";
}

const KEY = "aon_history_v1";

interface LocalRow {
  id: string;
  kind: HistoryKind;
  text: string;
  createdAt: number;
  dialect?: string;
  audioUrl?: string;
  durationSeconds?: number;
}

function readLocal(): LocalRow[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: LocalRow[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
}

export async function addHistory(item: {
  kind: HistoryKind;
  text: string;
  dialect?: string;
  audioUrl?: string;
  durationSeconds?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("transcriptions").insert({
      user_id: user.id,
      kind: item.kind,
      text: item.text,
      dialect: item.dialect ?? null,
      audio_url: item.audioUrl ?? null,
      duration_seconds: item.durationSeconds ?? null,
    });
    return;
  }
  const items = readLocal();
  items.unshift({ ...item, id: crypto.randomUUID(), createdAt: Date.now() });
  writeLocal(items);
}

export async function getHistory(): Promise<HistoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      text: r.text,
      createdAt: new Date(r.created_at).getTime(),
      dialect: r.dialect ?? undefined,
      audioUrl: r.audio_url ?? undefined,
      durationSeconds: r.duration_seconds ?? undefined,
      source: "cloud" as const,
    }));
  }
  return readLocal().map((r) => ({ ...r, source: "local" as const }));
}

export async function removeHistory(id: string, source: "local" | "cloud") {
  if (source === "cloud") {
    await supabase.from("transcriptions").delete().eq("id", id);
  } else {
    writeLocal(readLocal().filter((i) => i.id !== id));
  }
}

export async function clearHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("transcriptions").delete().eq("user_id", user.id);
  }
  localStorage.removeItem(KEY);
}
