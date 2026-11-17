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
import { getPendingPractice, pinPractice } from "./practice-store";
import { currentFocus, weaknessBoard } from "./board";

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

describe("weaknessBoard", () => {
  beforeEach(async () => {
    await db.delete(practiceRequests).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("ranks and exposes pending pin", async () => {
    await seedEvaluated("2026-11-16T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-15T18:00:00.000Z", ["accents"]);
    await seedEvaluated("2026-11-10T18:00:00.000Z", ["negation"]);
    await pinPractice("negation", () => new Date("2026-11-16T19:00:00.000Z"));

    const board = await weaknessBoard();

    expect(board.ranked.map((row) => row.category)).toEqual([
      "accents",
      "negation",
    ]);
    expect(board.ranked.map((row) => row.trend)).toEqual([
      "actif",
      "en_progres",
    ]);
    expect(board.pin).toBe("negation");
    expect(board.focusIds).toEqual(["negation", "accents"]);
  });

  it("leaves autre out of Focus ids", async () => {
    await seedEvaluated("2026-11-16T18:00:00.000Z", ["autre", "articles"]);
    await seedEvaluated("2026-11-15T18:00:00.000Z", ["autre"]);
    await pinPractice("autre", () => new Date("2026-11-16T19:00:00.000Z"));

    const board = await weaknessBoard();

    expect(board.ranked.map((row) => row.category)).toEqual([
      "autre",
      "articles",
    ]);
    expect(board.pin).toBe("autre");
    expect(board.focusIds).toEqual(["articles"]);
  });
});

describe("currentFocus", () => {
  beforeEach(async () => {
    await db.delete(practiceRequests).execute();
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
  });

  it("live ids for home snapshot", async () => {
    await seedEvaluated("2026-11-16T18:00:00.000Z", ["vocabulaire", "accents"]);
    await seedEvaluated("2026-11-15T18:00:00.000Z", ["vocabulaire", "accents"]);
    await seedEvaluated("2026-11-14T18:00:00.000Z", ["vocabulaire"]);
    await pinPractice("negation", () => new Date("2026-11-16T19:00:00.000Z"));
    const pending = await getPendingPractice();

    const snapshot = await currentFocus(JSON.stringify(["orthographe"]));

    expect(snapshot.focusIds).toEqual(["orthographe"]);
    expect(snapshot.pin).toBe("negation");
    expect(snapshot.practiceId).toBe(pending?.id);
  });
});
