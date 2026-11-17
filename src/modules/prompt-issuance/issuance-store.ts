import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import type { CefrLevel } from "@/contracts/cefr";
import {
  PromptSessionDto,
  QuotaGetResponse,
  type PromptPostBodyValue,
} from "@/contracts/api";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { localDateKey } from "@/lib/dates";
import { countWords } from "@/lib/count-words";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { getCurrentLevel } from "@/modules/cefr-tracker/level-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { elicitFocus } from "@/modules/dialect/taxonomy";
import {
  PromptGenerator,
  type OpenAiClientLike,
} from "@/modules/prompt-generator/prompt-generator";
import { currentFocus } from "@/modules/weakness-service/board";
import { consumePendingPin } from "@/modules/weakness-service/practice-store";
import {
  QuotaExhaustedError,
  assertQuotaAvailable,
  getQuotaState,
  quotaTimeZone,
} from "@/modules/quota-manager/quota-store";

type SessionRow = typeof sessions.$inferSelect;

export type IssueDailyPromptInput = {
  body: PromptPostBodyValue;
};

export type IssueDailyPromptDeps = {
  client: OpenAiClientLike;
  now: () => Date;
};

export type IssueDailyPromptResult =
  | {
      ok: true;
      session: z.infer<typeof PromptSessionDto>;
      quota: z.infer<typeof QuotaGetResponse>;
    }
  | { ok: false; code: "QUOTA_EXHAUSTED"; resetsAt: string }
  | { ok: false; code: "DRAFT_WOULD_BE_ABANDONED"; wordCount: number }
  | { ok: false; code: "NO_LEVEL" };

let quotaPromptChain = Promise.resolve();

function withQuotaPromptLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = quotaPromptChain.then(fn, fn);
  quotaPromptChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function blockedDraftWordCount(
  activeRows: readonly SessionRow[],
  body: PromptPostBodyValue,
): number | null {
  if (body.confirmAbandon === true) return null;
  const withWords = activeRows.filter(
    (row) => countWords(row.writingText ?? "") > 0,
  );
  const draft =
    withWords.find((row) => row.id === body.replaceSessionId) ?? withWords[0];
  if (draft === undefined) return null;
  return countWords(draft.writingText ?? "");
}

async function recentTopics(): Promise<string[]> {
  const rows = await db
    .select({ promptMetaJson: sessions.promptMetaJson })
    .from(sessions)
    .orderBy(desc(sessions.createdAt))
    .limit(10);
  const topics: string[] = [];
  for (const row of rows) {
    const meta = parseStoredPromptMeta(row.promptMetaJson);
    if (meta === null) continue;
    topics.push(meta.topic, ...meta.topicTags);
  }
  return topics;
}

async function todayActiveSessions(now: Date): Promise<SessionRow[]> {
  const today = localDateKey(now, quotaTimeZone());
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.kind, "daily"),
        eq(sessions.localDate, today),
        eq(sessions.status, "active"),
      ),
    )
    .orderBy(desc(sessions.createdAt));
}

async function issueLocked(
  level: CefrLevel,
  input: IssueDailyPromptInput,
  deps: IssueDailyPromptDeps,
): Promise<IssueDailyPromptResult> {
  const transaction = { open: false };
  try {
    let activeRows = await todayActiveSessions(deps.now());
    const blocked = blockedDraftWordCount(activeRows, input.body);
    if (blocked !== null) {
      return {
        ok: false,
        code: "DRAFT_WOULD_BE_ABANDONED",
        wordCount: blocked,
      };
    }

    try {
      await assertQuotaAvailable();
    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        return {
          ok: false,
          code: "QUOTA_EXHAUSTED",
          resetsAt: error.resetsAt,
        };
      }
      throw error;
    }

    const live = await currentFocus();
    const prompt = await new PromptGenerator(deps.client).generate(
      level,
      DEFAULT_DIALECT,
      {
        focus: elicitFocus(live.focusIds),
        recentTopics: await recentTopics(),
      },
    );
    const meta = prompt.meta;
    if (meta === undefined) {
      throw new Error("Writing Prompt is missing meta");
    }

    activeRows = await todayActiveSessions(deps.now());
    const blockedAgain = blockedDraftWordCount(activeRows, input.body);
    if (blockedAgain !== null) {
      return {
        ok: false,
        code: "DRAFT_WOULD_BE_ABANDONED",
        wordCount: blockedAgain,
      };
    }

    const stamped = deps.now();
    const createdAt = stamped.toISOString();
    const localDate = localDateKey(stamped, quotaTimeZone());
    const activeIds = activeRows.map((row) => row.id);
    await db.run(sql`begin immediate`);
    transaction.open = true;
    if (activeIds.length > 0) {
      await db
        .update(sessions)
        .set({ status: "abandoned", abandonedAt: createdAt })
        .where(
          and(inArray(sessions.id, activeIds), eq(sessions.status, "active")),
        );
    }

    const inserted = await db.insert(sessions).values({
      promptText: prompt.text,
      promptMetaJson: JSON.stringify(meta),
      promptConstraints: JSON.stringify(prompt.constraints),
      writingText: null,
      evaluationJson: null,
      cefrLevel: null,
      promptLevel: level,
      status: "active",
      createdAt,
      kind: "daily",
      localDate,
      focusJson: JSON.stringify(live.focusIds),
    });
    const sessionId = Number(inserted.lastInsertRowid);
    if (live.practiceId !== null) {
      await consumePendingPin(live.practiceId, sessionId);
    }
    await db.run(sql`commit`);
    transaction.open = false;

    return {
      ok: true,
      session: {
        id: sessionId,
        promptText: prompt.text,
        promptMeta: meta,
      },
      quota: await getQuotaState(),
    };
  } catch (error) {
    if (transaction.open) {
      await db.run(sql`rollback`);
    }
    throw error;
  }
}

export async function issueDailyPrompt(
  input: IssueDailyPromptInput,
  deps: IssueDailyPromptDeps,
): Promise<IssueDailyPromptResult> {
  const level = await getCurrentLevel();
  if (level === null) {
    return { ok: false, code: "NO_LEVEL" };
  }
  return withQuotaPromptLock(() => issueLocked(level, input, deps));
}
