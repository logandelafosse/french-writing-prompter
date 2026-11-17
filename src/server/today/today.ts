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
import { parseStoredFocus } from "@/lib/parse-stored-focus";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { toFocusItems } from "@/modules/dialect/taxonomy";
import { computeFocus } from "@/modules/weakness-service/compute-focus";
import { getPendingPin } from "@/modules/weakness-service/practice-store";
import { listRankedWeaknesses } from "@/modules/weakness-service/weakness-store";
import { and, desc, eq } from "drizzle-orm";
import type { MistakeCategory } from "@/contracts/mistake-category";
import type { FocusItem } from "@/contracts/focus";

export async function resolveLearnerFocus(
  focusJson?: string | null,
): Promise<{ focus: FocusItem[]; pin: MistakeCategory | null }> {
  const pin = await getPendingPin();
  if (focusJson !== undefined) {
    const snapshot = parseStoredFocus(focusJson);
    if (snapshot !== null) return { focus: toFocusItems(snapshot), pin };
  }
  return {
    focus: toFocusItems(computeFocus(await listRankedWeaknesses(), pin)),
    pin,
  };
}

export async function learnerFocusNow() {
  const active = await getTodayActiveSession();
  const review = active === null ? await getTodayReviewSession() : null;
  return resolveLearnerFocus(active?.focusJson ?? review?.focusJson);
}

async function getTodayActiveSession(): Promise<{
  session: TodayActiveSession;
  focusJson: string | null;
} | null> {
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
    session: {
      id: row.id,
      prompt: row.promptText,
      promptMeta: parseStoredPromptMeta(row.promptMetaJson),
      draft,
    },
    focusJson: row.focusJson,
  };
}

async function getTodayReviewSession(): Promise<{
  session: TodayReviewSession;
  focusJson: string | null;
} | null> {
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
    session: {
      id: row.id,
      prompt: row.promptText,
      promptMeta: parseStoredPromptMeta(row.promptMetaJson),
      writingText: row.writingText,
      evaluation: stored.value,
      corrections: await listCorrectionsForSession(row.id),
    },
    focusJson: row.focusJson,
  };
}

export async function buildTodayResponse(): Promise<TodayGetDto> {
  const [level, quota, active, advancement] = await Promise.all([
    getCurrentLevel(),
    getQuotaState(),
    getTodayActiveSession(),
    getPendingAdvancement(),
  ]);

  const review = active === null ? await getTodayReviewSession() : null;
  const { focus, pin } = await resolveLearnerFocus(
    active?.focusJson ?? review?.focusJson,
  );

  return {
    level,
    levelName: level ? CEFR_UI_LABELS[level] : null,
    quota,
    focus,
    pin,
    activeSession: active?.session ?? null,
    reviewSession: review?.session ?? null,
    advancement,
  };
}
