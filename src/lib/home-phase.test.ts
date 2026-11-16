import { describe, expect, it } from "vitest";
import { resolveHomePhase } from "@/contracts/today";
import type { TodayGetDto } from "@/contracts/today";

function bootstrap(
  overrides: Partial<TodayGetDto> & Pick<TodayGetDto, "level">,
): TodayGetDto {
  return {
    levelName: overrides.level ? "Seuil" : null,
    quota: {
      used: 0,
      remaining: 3,
      max: 3,
      resetsAt: "2026-11-16T06:00:00.000Z",
    },
    focus: [],
    activeSession: null,
    advancement: null,
    ...overrides,
  };
}

describe("resolveHomePhase", () => {
  it("maps no level to A0-first-run", () => {
    expect(resolveHomePhase(bootstrap({ level: null }))).toEqual({
      kind: "A0-first-run",
    });
  });

  it("maps level without session to A-ready", () => {
    expect(
      resolveHomePhase(bootstrap({ level: "B1", activeSession: null })),
    ).toEqual({ kind: "A-ready" });
  });

  it("maps level with active session to B-writing", () => {
    expect(
      resolveHomePhase(
        bootstrap({
          level: "B1",
          activeSession: {
            id: 42,
            prompt: "Écrivez sur la Nouvelle-Orléans.",
            meta: null,
            draft: null,
          },
        }),
      ),
    ).toEqual({
      kind: "B-writing",
      sessionId: 42,
      promptText: "Écrivez sur la Nouvelle-Orléans.",
      promptMeta: null,
    });
  });

  it("maps evaluated-only sessions to A-ready when activeSession is null", () => {
    expect(
      resolveHomePhase(bootstrap({ level: "A2", activeSession: null })),
    ).toEqual({ kind: "A-ready" });
  });
});
