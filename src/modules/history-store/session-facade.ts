import type { SessionDetail } from "@/contracts/session";
import { countWords } from "@/lib/count-words";
import { getSession, getSessionDetail, rememberWriting } from "./history-store";

type SaveDraftResult =
  | { ok: true; savedAt: string; wordCount: number }
  | { ok: false; code: "NOT_FOUND" | "NOT_ACTIVE" };

/** Persist a Draft only while the Session is active. */
export async function saveDraft(
  sessionId: number,
  text: string,
  now: () => Date,
): Promise<SaveDraftResult> {
  const session = await getSession(sessionId);
  if (session === null) return { ok: false, code: "NOT_FOUND" };
  if (session.status !== "active") return { ok: false, code: "NOT_ACTIVE" };

  const savedAt = now().toISOString();
  await rememberWriting(sessionId, text, savedAt);
  return { ok: true, savedAt, wordCount: countWords(text) };
}

/** Session as stored for review: Evaluation scores and Corrections. */
export async function loadSessionForReview(
  sessionId: number,
  now: () => Date,
): Promise<SessionDetail | null> {
  return getSessionDetail(sessionId, { now });
}
