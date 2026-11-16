import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { levelChanges, sessions } from "@/db/schema";
import {
  getStreakCount,
  recordEvaluation,
  setLevel,
  undoAutoAdvancement,
  UndoLevelError,
} from "./level-store";

async function insertEvaluatedSession(
  cefrLevel: string,
  evaluatedAt: string,
  createdAt: string,
): Promise<void> {
  await db.insert(sessions).values({
    promptText: "Consigne",
    promptConstraints: "{}",
    writingText: "Texte",
    evaluationJson: "{}",
    cefrLevel,
    createdAt,
    kind: "daily",
    localDate: "2026-11-16",
    status: "evaluated",
    evaluatedAt,
    promptLevel: "B1",
  });
}

describe("level-store integration", () => {
  beforeEach(async () => {
    await db.delete(sessions).execute();
    await db.delete(levelChanges).execute();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("level state is rebuilt from the DB on every call", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    await setLevel("B1", "manual");
    await insertEvaluatedSession(
      "B2",
      "2026-01-02T12:00:00.000Z",
      "2026-01-02T12:00:00.000Z",
    );
    await insertEvaluatedSession(
      "B2",
      "2026-01-03T12:00:00.000Z",
      "2026-01-03T12:00:00.000Z",
    );

    const streakBefore = await getStreakCount();
    expect(streakBefore).toBe(2);

    await insertEvaluatedSession(
      "B2",
      "2026-01-04T12:00:00.000Z",
      "2026-01-04T12:00:00.000Z",
    );
    const promoted = await recordEvaluation("B2");
    expect(promoted?.toLevel).toBe("B2");
    expect(await getStreakCount()).toBe(0);
  });

  it("recordEvaluation at C2 is a no-op", async () => {
    await setLevel("C2", "manual");
    await insertEvaluatedSession(
      "C2",
      "2026-01-01T12:00:00.000Z",
      "2026-01-01T12:00:00.000Z",
    );
    await insertEvaluatedSession(
      "C2",
      "2026-01-02T12:00:00.000Z",
      "2026-01-02T12:00:00.000Z",
    );
    await insertEvaluatedSession(
      "C2",
      "2026-01-03T12:00:00.000Z",
      "2026-01-03T12:00:00.000Z",
    );

    const result = await recordEvaluation("C2");
    expect(result).toBeNull();

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.toLevel).toBe("C2");
  });

  it("C1 plus three B1 recordEvaluation stays at C1", async () => {
    await setLevel("C1", "manual");
    await insertEvaluatedSession(
      "B1",
      "2026-01-01T13:00:00.000Z",
      "2026-01-01T13:00:00.000Z",
    );
    await insertEvaluatedSession(
      "B1",
      "2026-01-02T12:00:00.000Z",
      "2026-01-02T12:00:00.000Z",
    );
    const result = await recordEvaluation("B1");
    expect(result).toBeNull();

    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.toLevel).toBe("C1");
  });

  it("undo reverts only the latest auto change", async () => {
    const manual = await setLevel("B1", "manual");
    expect(manual.id).toBeGreaterThan(0);

    const auto = await setLevel("B2", "auto");
    const undone = await undoAutoAdvancement(auto.id);
    expect(undone.source).toBe("undo");
    expect(undone.toLevel).toBe("B1");
    expect(undone.revertsChangeId).toBe(auto.id);
    expect(await getStreakCount()).toBe(0);

    await expect(undoAutoAdvancement(auto.id)).rejects.toBeInstanceOf(
      UndoLevelError,
    );

    await expect(undoAutoAdvancement(manual.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("mirrors e2e seed: two prior B2 evals plus a third promotes B1 to B2", async () => {
    vi.setSystemTime(new Date("2026-11-16T09:00:00.000Z"));
    await setLevel("B1", "manual");
    await insertEvaluatedSession(
      "B2",
      "2026-11-16T11:00:00.000Z",
      "2026-11-16T11:00:00.000Z",
    );
    await insertEvaluatedSession(
      "B2",
      "2026-11-16T12:00:00.000Z",
      "2026-11-16T12:00:00.000Z",
    );
    await insertEvaluatedSession(
      "B2",
      "2026-11-16T14:00:00.000Z",
      "2026-11-16T14:00:00.000Z",
    );
    const promoted = await recordEvaluation("B2");
    expect(promoted?.toLevel).toBe("B2");
  });

  it("with no level set recordEvaluation does nothing", async () => {
    const result = await recordEvaluation("B2");
    expect(result).toBeNull();
    const rows = await db.select().from(levelChanges);
    expect(rows).toHaveLength(0);
  });
});
