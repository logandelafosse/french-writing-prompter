import { NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getAiClient, scenarioFromRequest } from "@/server/ai-client";
import { PromptGenerator } from "@/modules/prompt-generator/prompt-generator";
import {
  QuotaExhaustedError,
  assertQuotaAvailable,
  getQuotaState,
  quotaTimeZone,
} from "@/modules/quota-manager/quota-store";
import { getCurrentLevel } from "@/modules/cefr-tracker/level-store";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { elicitFocus } from "@/modules/dialect/taxonomy";
import { computeFocus } from "@/modules/weakness-service/compute-focus";
import {
  consumePendingPin,
  getPendingPractice,
} from "@/modules/weakness-service/practice-store";
import { listRankedWeaknesses } from "@/modules/weakness-service/weakness-store";
import { localDateKey, todayLocalDateKey } from "@/lib/dates";
import { countWords } from "@/lib/count-words";
import { parseStoredPromptMeta } from "@/lib/parse-stored-prompt-meta";
import { parseRequestBody } from "@/lib/http";
import { PromptPostBody, type PromptPostBodyValue } from "@/contracts/api";
import { withErrors } from "@/server/with-errors";

let quotaPromptChain = Promise.resolve();

function withQuotaPromptLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = quotaPromptChain.then(fn, fn);
  quotaPromptChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readPromptBody(request: Request) {
  const text = await request.text();
  const json = text.trim().length === 0 ? "{}" : text;
  return parseRequestBody(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    }),
    PromptPostBody,
  );
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

async function todayActiveSessions() {
  const today = todayLocalDateKey(quotaTimeZone());
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

function draftAbandonBlocked(
  activeRows: Awaited<ReturnType<typeof todayActiveSessions>>,
  body: PromptPostBodyValue,
): NextResponse | null {
  const withWords = activeRows.filter(
    (row) => countWords(row.writingText ?? "") > 0,
  );
  const draft =
    withWords.find((row) => row.id === body.replaceSessionId) ?? withWords[0];
  if (draft && body.confirmAbandon !== true) {
    return NextResponse.json(
      {
        error: "DRAFT_WOULD_BE_ABANDONED" as const,
        wordCount: countWords(draft.writingText ?? ""),
      },
      { status: 409 },
    );
  }
  return null;
}

export const POST = withErrors(async function postPrompt(request: Request) {
  const level = await getCurrentLevel();
  if (!level) {
    return NextResponse.json(
      { error: "No CEFR level set. Please set your level first." },
      { status: 400 },
    );
  }

  const parsed = await readPromptBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const transaction = { open: false };

  try {
    return await withQuotaPromptLock(async () => {
      let activeRows = await todayActiveSessions();
      let blocked = draftAbandonBlocked(activeRows, body);
      if (blocked) return blocked;

      await assertQuotaAvailable();

      const promptGenerator = new PromptGenerator(
        getAiClient(scenarioFromRequest(request)),
      );

      const ranked = await listRankedWeaknesses();
      const pin = await getPendingPractice();
      const focusIds = computeFocus(ranked, pin?.category ?? null);
      const prompt = await promptGenerator.generate(level, DEFAULT_DIALECT, {
        focus: elicitFocus(focusIds),
        recentTopics: await recentTopics(),
      });

      activeRows = await todayActiveSessions();
      blocked = draftAbandonBlocked(activeRows, body);
      if (blocked) return blocked;

      const now = new Date().toISOString();
      const localDate = localDateKey(new Date(now), quotaTimeZone());
      const activeIds = activeRows.map((row) => row.id);
      await db.run(sql`begin immediate`);
      transaction.open = true;
      if (activeIds.length > 0) {
        await db
          .update(sessions)
          .set({ status: "abandoned", abandonedAt: now })
          .where(
            and(inArray(sessions.id, activeIds), eq(sessions.status, "active")),
          );
      }

      const inserted = await db.insert(sessions).values({
        promptText: prompt.text,
        promptMetaJson: JSON.stringify(prompt.meta),
        promptConstraints: JSON.stringify(prompt.constraints),
        writingText: null,
        evaluationJson: null,
        cefrLevel: null,
        promptLevel: level,
        status: "active",
        createdAt: now,
        kind: "daily",
        localDate,
        focusJson: JSON.stringify(focusIds),
      });
      const sessionId = Number(inserted.lastInsertRowid);
      if (pin !== null) await consumePendingPin(pin.id, sessionId);
      await db.run(sql`commit`);
      transaction.open = false;
      const quota = await getQuotaState();

      return NextResponse.json({
        session: {
          id: sessionId,
          promptText: prompt.text,
          promptMeta: prompt.meta,
        },
        quota,
      });
    });
  } catch (error) {
    if (transaction.open) {
      await db.run(sql`rollback`);
    }
    if (error instanceof QuotaExhaustedError) {
      return NextResponse.json(
        {
          error: "QUOTA_EXHAUSTED",
          resetsAt: error.resetsAt,
        },
        { status: 429 },
      );
    }
    throw error;
  }
});
