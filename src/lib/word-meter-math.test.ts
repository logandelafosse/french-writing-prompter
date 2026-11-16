import { describe, expect, it } from "vitest";
import {
  shouldShowWordNudge,
  wordMeterFillRatio,
  wordMeterZoneStartRatio,
} from "./word-meter-math";
describe("word meter", () => {
  it("caps fill and zone", () => {
    expect(wordMeterFillRatio(2000, 300)).toBe(1);
    expect(wordMeterZoneStartRatio(250, 300)).toBeCloseTo(250 / 300);
  });
  it("nudges B1 gap 30-80", () => {
    expect(shouldShowWordNudge(200, { min: 250, max: 300 })).toBe(true);
    expect(shouldShowWordNudge(5, { min: 10, max: 20 })).toBe(false);
  });
});
