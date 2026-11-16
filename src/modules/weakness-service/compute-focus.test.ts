import { describe, expect, it } from "vitest";
import type { MistakeCategory } from "@/contracts/mistake-category";
import { computeFocus, type FocusCandidate } from "./compute-focus";

function candidate(
  partial: Pick<FocusCandidate, "category" | "trend"> & Partial<FocusCandidate>,
): FocusCandidate {
  return {
    s: 1,
    windowCount: 1,
    lastSeenAt: "2026-11-16T18:00:00.000Z",
    ...partial,
  };
}

function ids(rows: FocusCandidate[], pin: MistakeCategory | null) {
  return computeFocus(rows, pin);
}

describe("computeFocus", () => {
  it("returns empty for a new learner", () => {
    expect(ids([], null)).toEqual([]);
  });

  it("puts a pending pin first then fills from actif", () => {
    expect(
      ids(
        [
          candidate({
            category: "genre",
            trend: "actif",
            s: 3,
            windowCount: 4,
          }),
          candidate({
            category: "accents",
            trend: "en_progres",
            s: 1,
            windowCount: 1,
            lastSeenAt: "2026-11-15T18:00:00.000Z",
          }),
          candidate({
            category: "accord",
            trend: "actif",
            s: 2,
            windowCount: 2,
            lastSeenAt: "2026-11-14T18:00:00.000Z",
          }),
        ],
        "accents",
      ),
    ).toEqual(["accents", "genre"]);
  });

  it("fills up to two actif ranked by s, then window count, then lastSeenAt", () => {
    expect(
      ids(
        [
          candidate({
            category: "genre",
            trend: "actif",
            s: 2,
            windowCount: 5,
            lastSeenAt: "2026-11-10T18:00:00.000Z",
          }),
          candidate({
            category: "accord",
            trend: "actif",
            s: 2,
            windowCount: 3,
            lastSeenAt: "2026-11-16T18:00:00.000Z",
          }),
          candidate({
            category: "prepositions",
            trend: "actif",
            s: 3,
            windowCount: 3,
            lastSeenAt: "2026-11-01T18:00:00.000Z",
          }),
        ],
        null,
      ),
    ).toEqual(["prepositions", "genre"]);
  });

  it("excludes autre and non-actif when filling", () => {
    expect(
      ids(
        [
          candidate({
            category: "autre",
            trend: "actif",
            s: 5,
            windowCount: 5,
          }),
          candidate({ category: "genre", trend: "en_progres" }),
          candidate({
            category: "accord",
            trend: "tranquille",
            s: 0,
            windowCount: 0,
            lastSeenAt: "2026-11-01T18:00:00.000Z",
          }),
          candidate({
            category: "accents",
            trend: "actif",
            s: 2,
            windowCount: 2,
            lastSeenAt: "2026-11-15T18:00:00.000Z",
          }),
        ],
        null,
      ),
    ).toEqual(["accents"]);
  });

  it("does not duplicate a pin that is already actif", () => {
    expect(
      ids(
        [
          candidate({ category: "genre", trend: "actif", s: 3 }),
          candidate({
            category: "accord",
            trend: "actif",
            s: 2,
            lastSeenAt: "2026-11-14T18:00:00.000Z",
          }),
        ],
        "genre",
      ),
    ).toEqual(["genre", "accord"]);
  });
});
