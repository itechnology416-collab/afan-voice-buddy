export type HistoryKind = "stt" | "tts";

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  text: string;
  createdAt: number;
  dialect?: string;
}

const KEY = "aon_history_v1";

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addHistory(item: Omit<HistoryItem, "id" | "createdAt">) {
  const items = getHistory();
  const next: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  items.unshift(next);
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
  return next;
}

export function removeHistory(id: string) {
  const items = getHistory().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
