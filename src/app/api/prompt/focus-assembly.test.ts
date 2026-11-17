import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { pinPractice } from "@/modules/weakness-service/practice-store";
import { currentFocus } from "@/modules/weakness-service/board";
import { POST } from "./route";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

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

describe("POST /api/prompt focus assembly", () => {
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

  it("snapshots live Focus from the façade and consumes that Practice Pin", async () => {
    await seedEvaluated("2026-11-16T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-15T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-10T18:00:00.000Z", ["negation"]);
    await pinPractice("negation", () => new Date("2026-11-16T19:00:00.000Z"));

    const response = await POST(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(response.status).toBe(200);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "active"));
    expect(rows[0]?.focusJson).toBe(JSON.stringify(["negation", "accents"]));
    expect(await currentFocus()).toMatchObject({ pin: null, practiceId: null });
  });
});
