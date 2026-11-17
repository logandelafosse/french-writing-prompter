import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { corrections, practiceRequests, sessions } from "@/db/schema";
import { Correction } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { pinPractice } from "@/modules/weakness-service/practice-store";
import { resolveLearnerFocus } from "./today";

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

describe("resolveLearnerFocus", () => {
  beforeEach(async () => {
    await db.delete(practiceRequests).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("reads live Focus from the façade and keeps a stored snapshot", async () => {
    await seedEvaluated("2026-11-16T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-15T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-10T18:00:00.000Z", ["negation"]);
    await pinPractice("negation", () => new Date("2026-11-16T19:00:00.000Z"));

    const live = await resolveLearnerFocus(undefined);
    expect(live.focus.map((item) => item.id)).toEqual(["negation", "accents"]);
    expect(live.pin).toBe("negation");

    const stored = await resolveLearnerFocus(JSON.stringify(["orthographe"]));
    expect(stored.focus.map((item) => item.id)).toEqual(["orthographe"]);
    expect(stored.pin).toBe("negation");

    const cleared = await resolveLearnerFocus(null);
    expect(cleared.focus.map((item) => item.id)).toEqual([
      "negation",
      "accents",
    ]);
    expect(cleared.pin).toBe("negation");

    const invalid = await resolveLearnerFocus("{");
    expect(invalid.focus).toEqual([]);
    expect(invalid.pin).toBe("negation");
  });
});
