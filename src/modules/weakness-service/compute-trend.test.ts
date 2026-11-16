import { describe, expect, it } from "vitest";
import { computeTrend } from "./compute-trend";

describe("computeTrend", () => {
  it.each([
    {
      name: "latest session has one",
      window: [true, false, false, false, false],
      trend: "actif",
    },
    {
      name: "2+ of last 5 without the latest",
      window: [false, true, true, false, false],
      trend: "actif",
    },
    {
      name: "exactly 1, not latest",
      window: [false, true, false, false, false],
      trend: "en_progres",
    },
    {
      name: "0 in window",
      window: [false, false, false, false, false],
      trend: "tranquille",
    },
    {
      name: "fewer than 5, latest has one",
      window: [true, false],
      trend: "actif",
    },
    {
      name: "fewer than 5, exactly 1 not latest",
      window: [false, true],
      trend: "en_progres",
    },
    {
      name: "fewer than 5, none",
      window: [false],
      trend: "tranquille",
    },
  ] as const)("$name → $trend", ({ window, trend }) => {
    expect(computeTrend(window)).toBe(trend);
  });
});
