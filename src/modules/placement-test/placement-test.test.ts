import { describe, expect, it } from "vitest";
import { buildResults, computeLevel, stepLevel } from "./placement-test";

describe("placement logic › fixed step levels and median result", () => {
  it("returns A2, B1, B2 for steps 1–3", () => {
    expect(stepLevel(1)).toBe("A2");
    expect(stepLevel(2)).toBe("B1");
    expect(stepLevel(3)).toBe("B2");
  });

  it("computeLevel of A2, B2, B1 is B1", () => {
    expect(computeLevel(["A2", "B2", "B1"])).toBe("B1");
  });
});

describe("placement logic › buildResults", () => {
  it("maps three evaluated sessions to steps in order and counts Mistakes", () => {
    const result = buildResults({ finalLevel: "B1" }, [
      {
        step: 2,
        promptLevel: "B1",
        evaluatedLevel: "B2",
        summary: "Étape 2",
        nextLevelTip: "Pour atteindre C1, varie tes temps.",
        corrections: [{ kind: "mistake", status: "open" }],
      },
      {
        step: 1,
        promptLevel: "A2",
        evaluatedLevel: "A2",
        summary: "Étape 1",
        nextLevelTip: "Pour atteindre B1, allonge tes phrases.",
        corrections: [],
      },
      {
        step: 3,
        promptLevel: "B2",
        evaluatedLevel: "B1",
        summary: "Étape 3",
        nextLevelTip: "Pour atteindre B2, varie tes connecteurs.",
        corrections: [
          { kind: "mistake", status: "open" },
          { kind: "mistake", status: "overturned" },
          { kind: "standard", status: "open" },
          { kind: "dialect_check", status: "confirmed_dialect" },
        ],
      },
    ]);

    expect(result.finalLevel).toBe("B1");
    expect(result.levelName).toBe("Seuil");
    expect(result.summary).toBe("Pour atteindre B2, varie tes connecteurs.");
    expect(result.steps.map((step) => step.step)).toEqual([1, 2, 3]);
    expect(result.steps[0]?.summary).toBe("Étape 1");
    expect(result.steps[0]?.mistakeCount).toBe(0);
    expect(result.steps[1]?.mistakeCount).toBe(1);
    expect(result.steps[2]?.mistakeCount).toBe(1);
    expect(result.steps[2]?.promptLevel).toBe("B2");
    expect(result.steps[2]?.evaluatedLevel).toBe("B1");
  });
});
