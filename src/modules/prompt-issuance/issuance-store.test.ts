import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  corrections,
  levelChanges,
  practiceRequests,
  sessions,
} from "@/db/schema";
import { Correction } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import {
  getSession,
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import type { OpenAiClientLike } from "@/modules/prompt-generator/prompt-generator";
import { getQuotaState } from "@/modules/quota-manager/quota-store";
import * as practiceStore from "@/modules/weakness-service/practice-store";
import { getAiClient } from "@/server/ai-client";
import { issueDailyPrompt } from "./issuance-store";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

function clientThatMustNotRun(): OpenAiClientLike {
  return {
    chatCompletionJSON: () => {
      throw new Error("generator should not run");
    },
  };
}

class RecordingClient implements OpenAiClientLike {
  systemPrompt = "";

  constructor(private readonly inner: OpenAiClientLike) {}

  chatCompletionJSON<S extends z.ZodType>(
    schema: S,
    params: {
      model: string;
      messages: Array<{ role: "system" | "user"; content: string }>;
    },
    schemaName?: string,
  ): Promise<z.infer<S>> {
    this.systemPrompt =
      params.messages.find((message) => message.role === "system")?.content ??
      "";
    if (schemaName === undefined) {
      return this.inner.chatCompletionJSON(schema, params);
    }
    return this.inner.chatCompletionJSON(schema, params, schemaName);
  }
}

function mistake(
  sessionId: number,
  id: string,
  category: MistakeCategory,
  ordinal: number,
): Correction {
  return Correction.parse({
    id,
    sessionId,
    ordinal,
    kind: "mistake",
    quote: "les enfant",
    span: { start: 0, end: 11 },
    anchor: "exact",
    suggestion: "les enfants",
    explanation: "Accord.",
    question: null,
    ruleIfDialect: null,
    category,
    dlf: null,
    resourceIds: [],
    status: "open",
    dialectNoteId: null,
    isFocus: false,
  });
}

async function seedEvaluated(
  evaluatedAt: string,
  categories: readonly MistakeCategory[],
) {
  const session = await saveSession({
    promptText: "Écris.",
    promptConstraints: constraints,
    writingText: "Les enfant jouent.",
    evaluationJson: "{}",
    cefrLevel: "B1",
    localDate: "2026-11-10",
    status: "evaluated",
  });
  await db
    .update(sessions)
    .set({ evaluatedAt })
    .where(eq(sessions.id, session.id));
  await saveCorrections(
    categories.map((category, index) =>
      mistake(session.id, `${evaluatedAt}-${category}`, category, index + 1),
    ),
    () => new Date(evaluatedAt),
  );
}

describe("issueDailyPrompt", { concurrent: false }, () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    await db.delete(practiceRequests).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
    await setLevel("B1", "manual");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses when quota exhausted", async () => {
    for (let i = 0; i < 3; i++) {
      await saveSession({
        promptText: `p${i}`,
        promptConstraints: constraints,
        writingText: null,
        evaluationJson: null,
        cefrLevel: "B1",
        localDate: "2026-11-14",
      });
    }

    const result = await issueDailyPrompt(
      { body: {} },
      { client: clientThatMustNotRun(), now: () => new Date() },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("QUOTA_EXHAUSTED");
    if (result.code !== "QUOTA_EXHAUSTED") return;
    expect(result.resetsAt).toMatch(/2026-11-15/);
  });

  it("abandons active draft only when confirmed", async () => {
    const active = await saveSession({
      promptText: "Ancienne consigne",
      promptConstraints: constraints,
      writingText: "un deux trois quatre",
      evaluationJson: null,
      cefrLevel: "B1",
      localDate: "2026-11-14",
      status: "active",
      promptLevel: "B1",
    });

    const blocked = await issueDailyPrompt(
      { body: { replaceSessionId: active.id } },
      { client: clientThatMustNotRun(), now: () => new Date() },
    );

    expect(blocked).toEqual({
      ok: false,
      code: "DRAFT_WOULD_BE_ABANDONED",
      wordCount: 4,
    });
    expect((await getSession(active.id))?.status).toBe("active");

    const before = await getQuotaState();
    const issued = await issueDailyPrompt(
      { body: { replaceSessionId: active.id, confirmAbandon: true } },
      { client: getAiClient("happy"), now: () => new Date() },
    );

    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.quota.used).toBe(before.used + 1);
    expect(issued.session.id).not.toBe(active.id);
    expect((await getSession(active.id))?.status).toBe("abandoned");
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, active.id));
    expect(rows[0]?.writingText).toBe("un deux trois quatre");
    expect(rows[0]?.abandonedAt).toBe("2026-11-14T18:00:00.000Z");
    expect((await getSession(issued.session.id))?.status).toBe("active");
  });

  it("stores Focus constraints and consumes the Practice Pin", async () => {
    await seedEvaluated("2026-11-16T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-15T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-10T18:00:00.000Z", ["negation"]);
    await practiceStore.pinPractice(
      "negation",
      () => new Date("2026-11-16T19:00:00.000Z"),
    );
    const recorder = new RecordingClient(getAiClient("happy"));

    const issued = await issueDailyPrompt(
      { body: {} },
      { client: recorder, now: () => new Date() },
    );

    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect((await getSession(issued.session.id))?.focusJson).toBe(
      '["negation","accents"]',
    );
    expect(recorder.systemPrompt).toContain("ce qui n'a pas eu lieu");
    expect(recorder.systemPrompt).toContain(
      "des mots où l'accent change le sens",
    );
    const pins = await db.select().from(practiceRequests);
    expect(pins).toHaveLength(1);
    expect(pins[0]?.category).toBe("negation");
    expect(pins[0]?.consumedSessionId).toBe(issued.session.id);
  });

  it("rolls back when a later step throws", async () => {
    await practiceStore.pinPractice(
      "negation",
      () => new Date("2026-11-16T19:00:00.000Z"),
    );
    vi.spyOn(practiceStore, "consumePendingPin").mockRejectedValueOnce(
      new Error("pin failed"),
    );

    await expect(
      issueDailyPrompt(
        { body: {} },
        { client: getAiClient("happy"), now: () => new Date() },
      ),
    ).rejects.toThrow("pin failed");

    expect(await db.select().from(sessions)).toEqual([]);
    expect(await practiceStore.getPendingPractice()).toMatchObject({
      category: "negation",
    });
  });

  it("refuses when no CEFR level is set", async () => {
    await db.delete(levelChanges).execute();
    const result = await issueDailyPrompt(
      { body: {} },
      { client: clientThatMustNotRun(), now: () => new Date() },
    );
    expect(result).toEqual({ ok: false, code: "NO_LEVEL" });
  });
});
