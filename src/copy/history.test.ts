import { describe, expect, it } from "vitest";
import {
  formatFauteCount,
  formatLevelLine,
  historyTitle,
  mistakeCount,
  pastReviewMeta,
} from "./history";

const prompt =
  "C'est samedi matin chez ta grand-mère, à la campagne, UNIQUE_PROMPT_xyz.";

describe("historyTitle", () => {
  it("never falls back to the prompt text", () => {
    expect(
      historyTitle({
        focusLabels: ["Infinitif ou participe", "Imparfait ou passé composé"],
        genre: "récit",
        date: "14 novembre",
      }),
    ).toBe("Infinitif ou participe · Imparfait ou passé composé");
    expect(
      historyTitle({
        focusLabels: [],
        genre: "récit",
        date: "14 novembre",
      }),
    ).toBe("récit · 14 novembre");
    const fallback = historyTitle({
      focusLabels: [],
      genre: null,
      date: "14 novembre",
    });
    expect(fallback).toBe("Séance du 14 novembre");
    expect(fallback).not.toContain(prompt);
    expect(
      historyTitle({
        focusLabels: ["Genre des noms"],
        genre: "récit",
        date: "14 novembre",
      }),
    ).not.toContain(prompt);
  });
});

const lateUtc = {
  createdAt: "2026-11-15T04:00:00.000Z",
  mistakeCount: 2,
  evaluatedLevel: "B1" as const,
  promptLevel: "A2" as const,
};

describe("pastReviewMeta", () => {
  it("joins weekday date, faute count and level without évaluée", () => {
    expect(pastReviewMeta(lateUtc, "America/Chicago")).toBe(
      "Samedi 14 novembre · 2 fautes · B1",
    );
  });

  it("uses the given timezone, not UTC, for createdAt", () => {
    expect(pastReviewMeta(lateUtc, "UTC")).toBe(
      "Dimanche 15 novembre · 2 fautes · B1",
    );
    expect(pastReviewMeta(lateUtc, "America/Chicago")).not.toBe(
      pastReviewMeta(lateUtc, "UTC"),
    );
  });
});

describe("mistakeCount", () => {
  it("counts only countsAsMistake Corrections", () => {
    expect(
      mistakeCount([
        { kind: "mistake", status: "open" },
        { kind: "mistake", status: "overturned" },
        { kind: "standard", status: "open" },
        { kind: "dialect_check", status: "confirmed_mistake" },
        { kind: "dialect_check", status: "confirmed_dialect" },
      ]),
    ).toBe(2);
    expect(formatFauteCount(0)).toBe("0 faute");
    expect(formatFauteCount(1)).toBe("1 faute");
    expect(formatFauteCount(2)).toBe("2 fautes");
  });
});

describe("levelLine", () => {
  it("joins level changes in French", () => {
    expect(
      formatLevelLine(
        [
          { id: 2, toLevel: "B1", createdAt: "2026-10-28T18:00:00.000Z" },
          { id: 1, toLevel: "A2", createdAt: "2026-10-03T18:00:00.000Z" },
        ],
        "America/Chicago",
      ),
    ).toBe("Niveau\u202F: A2 depuis le 3 octobre, B1 depuis le 28 octobre.");
    expect(formatLevelLine([])).toBeNull();
  });

  it("omits a reverted auto-advancement from getLevelHistory order", () => {
    expect(
      formatLevelLine(
        [
          {
            id: 3,
            toLevel: "A2",
            createdAt: "2026-10-29T18:00:00.000Z",
            revertsChangeId: 2,
          },
          { id: 2, toLevel: "B1", createdAt: "2026-10-28T18:00:00.000Z" },
          { id: 1, toLevel: "A2", createdAt: "2026-10-03T18:00:00.000Z" },
        ],
        "America/Chicago",
      ),
    ).toBe("Niveau\u202F: A2 depuis le 3 octobre.");
  });
});
