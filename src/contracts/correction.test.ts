import { describe, expect, it } from "vitest";
import { CorrectionStatus, countsAsMistake } from "./correction";

describe("countsAsMistake", () => {
  it("standard corrections never count as mistakes", () => {
    for (const status of CorrectionStatus.options) {
      expect(countsAsMistake({ kind: "standard", status })).toBe(false);
    }
  });

  it("open mistakes count and overturned mistakes do not", () => {
    expect(countsAsMistake({ kind: "mistake", status: "open" })).toBe(true);
    expect(countsAsMistake({ kind: "mistake", status: "overturned" })).toBe(
      false,
    );
  });
});
