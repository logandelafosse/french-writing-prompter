import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { corrections, levelChanges, sessions } from "@/db/schema";
import { Correction } from "@/contracts/correction";
import { FocusItem } from "@/contracts/focus";
import { TodayGetResponse } from "@/contracts/today";
import { WeaknessesGetResponse } from "@/contracts/api";
import { setLevel } from "@/modules/cefr-tracker/level-store";
import {
  saveCorrections,
  saveSession,
} from "@/modules/history-store/history-store";
import { DEFAULT_DIALECT } from "@/modules/dialect/louisiana-rules";
import { readResponseJson } from "@/test/read-response-json";
import { POST as postPrompt } from "@/app/api/prompt/route";
import { GET as getToday } from "./route";
import { GET as getWeaknesses } from "@/app/api/weaknesses/route";

const constraints = JSON.stringify({
  cefrLevel: "B1",
  dialect: DEFAULT_DIALECT,
});

function mistake(
  sessionId: number,
  id: string,
  category: Correction["category"],
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
  categories: Array<NonNullable<Correction["category"]>>,
) {
  const session = await saveSession({
    promptText: "Écris.",
    promptConstraints: constraints,
    writingText: "Les enfant jouent.",
    evaluationJson: "{}",
    cefrLevel: "B1",
    localDate: "2026-11-13",
    status: "evaluated",
  });
  await db
    .update(sessions)
    .set({ evaluatedAt })
    .where(eq(sessions.id, session.id));
  await saveCorrections(
    categories.map((category, index) =>
      mistake(
        session.id,
        `${session.id}-${category}-${String(index)}`,
        category,
        index + 1,
      ),
    ),
    () => new Date(evaluatedAt),
  );
  return session;
}

describe("Focus on today, weaknesses, and prompt snapshot", () => {
  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00-06:00"));
    await db.delete(corrections).execute();
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
    await setLevel("B1", "manual");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns computed Focus before a prompt and the snapshot after", async () => {
    await seedEvaluated("2026-11-13T18:00:00.000Z", [
      "infinitif_participe",
      "imparfait_pc",
    ]);
    await seedEvaluated("2026-11-12T18:00:00.000Z", [
      "infinitif_participe",
      "imparfait_pc",
    ]);

    const before = await readResponseJson(await getToday(), TodayGetResponse);
    expect(before.activeSession).toBeNull();
    expect(before.focus.map((item) => item.id)).toEqual([
      "infinitif_participe",
      "imparfait_pc",
    ]);
    expect(before.focus[0]).toEqual(
      FocusItem.parse({
        id: "infinitif_participe",
        name: "Infinitif ou participe (\u2011er / \u2011é)",
        inlineName: "infinitif ou participe (\u2011er / \u2011é)",
        historyName: "Infinitif ou participe",
        shortName: "\u2011er / \u2011é",
      }),
    );

    const weak = await readResponseJson(
      await getWeaknesses(),
      WeaknessesGetResponse,
    );
    expect(weak.focus.map((item) => item.id)).toEqual([
      "infinitif_participe",
      "imparfait_pc",
    ]);

    const posted = await postPrompt(
      new Request("http://localhost/api/prompt", { method: "POST" }),
    );
    expect(posted.status).toBe(200);

    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "active"));
    expect(rows[0]?.focusJson).toBe(
      JSON.stringify(["infinitif_participe", "imparfait_pc"]),
    );

    await seedEvaluated("2026-11-14T18:00:00.000Z", ["genre", "genre"]);
    await seedEvaluated("2026-11-11T18:00:00.000Z", ["genre"]);

    const after = await readResponseJson(await getToday(), TodayGetResponse);
    expect(after.activeSession).not.toBeNull();
    expect(after.focus.map((item) => item.id)).toEqual([
      "infinitif_participe",
      "imparfait_pc",
    ]);

    const weakAfter = await readResponseJson(
      await getWeaknesses(),
      WeaknessesGetResponse,
    );
    expect(weakAfter.focus[0]?.id).toBe("genre");
  });

  it("returns empty Focus for a new learner", async () => {
    const today = await readResponseJson(await getToday(), TodayGetResponse);
    expect(today.focus).toEqual([]);
    const weak = await readResponseJson(
      await getWeaknesses(),
      WeaknessesGetResponse,
    );
    expect(weak.focus).toEqual([]);
    expect(weak.weaknesses).toEqual([]);
  });
});
