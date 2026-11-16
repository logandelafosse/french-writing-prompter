import { db } from "@/db";
import { sessions } from "@/db/schema";
import { CEFR_UI_LABELS } from "@/contracts/cefr";
import type { TodayActiveSession, TodayGetDto } from "@/contracts/today";
import { todayLocalDateKey } from "@/lib/dates";
import { getCurrentLevel } from "@/modules/cefr-tracker/db-store";
import {
  getQuotaState,
  quotaTimeZone,
} from "@/modules/quota-manager/quota-store";
import { first } from "@/lib/first";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { and, desc, eq, isNull } from "drizzle-orm";

async function getTodayActiveSession(): Promise<TodayActiveSession | null> {
  const today = todayLocalDateKey(quotaTimeZone());
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.kind, "daily"),
        eq(sessions.localDate, today),
        isNull(sessions.evaluationJson),
      ),
    )
    .orderBy(desc(sessions.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = first(rows, `active session for ${today}`);
  return {
    id: row.id,
    prompt: row.promptText,
    promptMeta: parseStoredPromptMeta(row.promptMetaJson),
    draft: null,
  };
}

export async function buildTodayResponse(): Promise<TodayGetDto> {
  const [level, quota, activeSession] = await Promise.all([
    getCurrentLevel(),
    getQuotaState(),
    getTodayActiveSession(),
  ]);

  return {
    level,
    levelName: level ? CEFR_UI_LABELS[level] : null,
    quota,
    focus: [],
    activeSession,
    advancement: null,
  };
}
