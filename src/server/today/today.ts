import { db } from "@/db";
import { sessions } from "@/db/schema";
import { CEFR_UI_LABELS } from "@/contracts/cefr";
import { parseStoredEvaluation } from "@/contracts/evaluation";
import type {
  TodayActiveSession,
  TodayGetDto,
  TodayReviewSession,
} from "@/contracts/today";
import { todayLocalDateKey } from "@/lib/dates";
import {
  getCurrentLevel,
  getPendingAdvancement,
} from "@/modules/cefr-tracker/level-store";
import { listCorrectionsForSession } from "@/modules/history-store/history-store";
import {
  getQuotaState,
  quotaTimeZone,
} from "@/modules/quota-manager/quota-store";
import { first } from "@/lib/first";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { and, desc, eq } from "drizzle-orm";

async function getTodayActiveSession(): Promise<TodayActiveSession | null> {
  const today = todayLocalDateKey(quotaTimeZone());
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.kind, "daily"),
        eq(sessions.localDate, today),
        eq(sessions.status, "active"),
      ),
    )
    .orderBy(desc(sessions.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = first(rows, `active session for ${today}`);
  const draft =
    row.writingText !== null && row.writingSavedAt !== null
      ? { text: row.writingText, savedAt: row.writingSavedAt }
      : null;
  return {
    id: row.id,
    prompt: row.promptText,
    promptMeta: parseStoredPromptMeta(row.promptMetaJson),
    draft,
  };
}

async function getTodayReviewSession(): Promise<TodayReviewSession | null> {
  const today = todayLocalDateKey(quotaTimeZone());
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.kind, "daily"),
        eq(sessions.localDate, today),
        eq(sessions.status, "evaluated"),
      ),
    )
    .orderBy(desc(sessions.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = first(rows, `evaluated session for ${today}`);
  if (row.writingText === null) return null;
  const stored = parseStoredEvaluation(row.evaluationJson);
  if (stored.status !== "v2") return null;
  return {
    id: row.id,
    prompt: row.promptText,
    promptMeta: parseStoredPromptMeta(row.promptMetaJson),
    writingText: row.writingText,
    evaluation: stored.value,
    corrections: await listCorrectionsForSession(row.id),
  };
}

export async function buildTodayResponse(): Promise<TodayGetDto> {
  const [level, quota, activeSession, advancement] = await Promise.all([
    getCurrentLevel(),
    getQuotaState(),
    getTodayActiveSession(),
    getPendingAdvancement(),
  ]);

  const reviewSession =
    activeSession === null ? await getTodayReviewSession() : null;

  return {
    level,
    levelName: level ? CEFR_UI_LABELS[level] : null,
    quota,
    focus: [],
    activeSession,
    reviewSession,
    advancement,
  };
}
