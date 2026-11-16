import { describe, expect, it } from "vitest";
import {
  computeStreak,
  nextLevelUp,
  type StreakEvaluation,
} from "./level-store";
import { ADVANCEMENT_STREAK } from "@/config/limits";

function shouldPromote(streak: number): boolean {
  return streak >= ADVANCEMENT_STREAK;
}

const since = "2026-01-01T12:00:00.000Z";

function dailyEval(cefr: string, evaluatedAt: string): StreakEvaluation {
  return {
    kind: "daily",
    status: "evaluated",
    cefrLevel: cefr,
    evaluatedAt,
  };
}

describe("computeStreak", () => {
  it("counts trailing above-level evaluations since the last change", () => {
    const rows = [
      dailyEval("B2", "2026-01-03T12:00:00.000Z"),
      dailyEval("B2", "2026-01-02T12:00:00.000Z"),
      dailyEval("B2", "2026-01-01T13:00:00.000Z"),
    ];
    expect(computeStreak(rows, "B1", since)).toBe(3);
  });

  it("stops at the first at-or-below evaluation", () => {
    const rows = [
      dailyEval("B2", "2026-01-04T12:00:00.000Z"),
      dailyEval("B1", "2026-01-03T12:00:00.000Z"),
      dailyEval("B2", "2026-01-02T12:00:00.000Z"),
    ];
    expect(computeStreak(rows, "B1", since)).toBe(1);
  });

  it("excludes evaluations before the latest level change", () => {
    const rows = [
      dailyEval("B2", "2026-01-02T12:00:00.000Z"),
      dailyEval("B2", "2026-01-01T11:00:00.000Z"),
    ];
    expect(computeStreak(rows, "B1", since)).toBe(1);
  });

  it("ignores placement sessions", () => {
    const rows: StreakEvaluation[] = [
      {
        kind: "placement",
        status: "evaluated",
        cefrLevel: "B2",
        evaluatedAt: "2026-01-02T12:00:00.000Z",
      },
      dailyEval("B2", "2026-01-02T12:00:00.000Z"),
    ];
    expect(computeStreak(rows, "B1", since)).toBe(1);
  });
});

describe("recordEvaluation promotion rules", () => {
  it("shouldPromote at three consecutive above-level evaluations", () => {
    expect(shouldPromote(3)).toBe(true);
    expect(shouldPromote(2)).toBe(false);
  });

  it("never demotes — C1 learner with B1 evaluations stays capped", () => {
    const rows = [
      dailyEval("B1", "2026-01-03T12:00:00.000Z"),
      dailyEval("B1", "2026-01-02T12:00:00.000Z"),
      dailyEval("B1", "2026-01-01T13:00:00.000Z"),
    ];
    expect(computeStreak(rows, "C1", since)).toBe(0);
    expect(shouldPromote(computeStreak(rows, "C1", since))).toBe(false);
  });

  it("C2 has no next level", () => {
    expect(nextLevelUp("C2")).toBeNull();
  });
});
