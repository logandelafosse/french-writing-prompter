import { describe, expect, it } from "vitest";
import { deriveDisplayStatus } from "./display-status";

const today = "2026-11-16";

describe("deriveDisplayStatus", () => {
  it("maps stored state and day to display status", () => {
    const cases = [
      {
        row: {
          status: "evaluated" as const,
          localDate: today,
          writingText: "un deux",
        },
        display: "evaluated",
      },
      {
        row: {
          status: "active" as const,
          localDate: today,
          writingText: "un deux",
        },
        display: "in_progress",
      },
      {
        row: {
          status: "active" as const,
          localDate: today,
          writingText: "",
        },
        display: "in_progress",
      },
      {
        row: {
          status: "active" as const,
          localDate: "2026-11-15",
          writingText: "un deux",
        },
        display: "draft_abandoned",
      },
      {
        row: {
          status: "abandoned" as const,
          localDate: today,
          writingText: "un deux",
        },
        display: "draft_abandoned",
      },
      {
        row: {
          status: "abandoned" as const,
          localDate: today,
          writingText: "",
        },
        display: "prompt_unused",
      },
      {
        row: {
          status: "active" as const,
          localDate: "2026-11-15",
          writingText: null,
        },
        display: "prompt_unused",
      },
      {
        row: {
          status: "abandoned" as const,
          localDate: "2026-11-15",
          writingText: "   ",
        },
        display: "prompt_unused",
      },
    ];

    for (const entry of cases) {
      expect(deriveDisplayStatus(entry.row, today)).toBe(entry.display);
    }
  });
});
