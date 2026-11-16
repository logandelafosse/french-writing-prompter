import { describe, expect, it } from "vitest";
import { formatDialectNoteMeta } from "./carnet";

const today = () => new Date("2026-11-14T18:00:00-06:00");

describe("formatDialectNoteMeta", () => {
  it("renders a today's session note with the nouvelle tag", () => {
    expect(
      formatDialectNoteMeta(
        {
          createdAt: "2026-11-14T16:00:00-06:00",
          sourceSessionId: 12,
          scope: "word",
        },
        today,
      ),
    ).toBe("14 novembre · séance d'aujourd'hui · ce mot seulement · nouvelle");
  });

  it("omits the source for a manual note", () => {
    expect(
      formatDialectNoteMeta(
        {
          createdAt: "2026-11-14T16:00:00-06:00",
          sourceSessionId: null,
          scope: "word",
        },
        today,
      ),
    ).toBe("14 novembre · ce mot seulement · nouvelle");
  });

  it("shows nouvelle at 23 h and hides it at 25 h", () => {
    const created = "2026-11-13T19:00:00-06:00";
    const note = {
      createdAt: created,
      sourceSessionId: null as number | null,
      scope: "pattern" as const,
    };
    expect(
      formatDialectNoteMeta(note, () => new Date("2026-11-14T18:00:00-06:00")),
    ).toBe("13 novembre · toute la famille · nouvelle");
    expect(
      formatDialectNoteMeta(note, () => new Date("2026-11-14T20:00:00-06:00")),
    ).toBe("13 novembre · toute la famille");
  });
});
