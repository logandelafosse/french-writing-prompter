import { SavedDraft } from "@/contracts/session";
import { parseJson } from "@/lib/json";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function draftKey(sessionId: number): string {
  return `draft:${sessionId}`;
}

export function readLocalDraft(sessionId: number): {
  text: string;
  savedAt: string;
} | null {
  const store = storage();
  if (!store) return null;
  const key = draftKey(sessionId);
  const raw = store.getItem(key);
  if (raw === null) return null;
  const parsed = parseJson(SavedDraft, raw);
  if (!parsed.ok) {
    store.removeItem(key);
    return null;
  }
  return parsed.value;
}

export function writeLocalDraft(
  sessionId: number,
  draft: { text: string; savedAt: string },
): void {
  storage()?.setItem(draftKey(sessionId), JSON.stringify(draft));
}

export function removeInactiveDrafts(activeSessionId: number | null): void {
  const store = storage();
  if (!store) return;
  const keep = activeSessionId === null ? null : draftKey(activeSessionId);
  const stale: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key !== null && key.startsWith("draft:") && key !== keep) {
      stale.push(key);
    }
  }
  for (const key of stale) store.removeItem(key);
}
